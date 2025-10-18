import { MatchRepository } from "../repositories/MatchRepository";
import { PlayerRepository } from "../repositories/PlayerRepository";

import mongoose from "mongoose";
import { getIo } from "../socket/index";
import { CreateMatchDto, MoveDto } from "../dtos/match.dto";
import { decideWinner } from "../utils/gameLogic";
import { IMatch, IRound } from "../models/IMatch";
import { IMatchService } from "../models/IMatchService";

export class MatchService implements IMatchService {
    private matchRepo = new MatchRepository();
    private playerRepo = new PlayerRepository();
    private roundsToWin = 3; // Rondas necesarias para ganar la partida

    // Crear una nueva partida entre dos jugadores
    async createMatch(dto: CreateMatchDto) {
        if (dto.playerA === dto.playerB) {
            const e: any = new Error("Los jugadores deben ser diferentes.");
            e.status = 400;
            throw e;
        }

        const playerA = await this.playerRepo.findById(dto.playerA);
        const playerB = await this.playerRepo.findById(dto.playerB);
        if (!playerA || !playerB) {
            const e: any = new Error("Ambos jugadores deben existir.");
            e.status = 404;
            throw e;
        }

        // Validar si ya hay una partida activa entre ambos jugadores
        const existingMatch = await this.matchRepo.findActiveBetween(dto.playerA, dto.playerB);
        if (existingMatch) {
            const e: any = new Error("Ya existe una partida activa entre estos jugadores. Debe finalizar antes de crear una nueva.");
            e.status = 400;
            throw e;
        }

        // Elegir quién inicia (aleatorio)
        const starter = Math.random() > 0.5 ? dto.playerA : dto.playerB;

        const match = await this.matchRepo.create({
            playerA: new mongoose.Types.ObjectId(dto.playerA),
            playerB: new mongoose.Types.ObjectId(dto.playerB),
            rounds: [],
            score: { playerA: 0, playerB: 0 },
            status: "ONGOING",
            currentTurn: new mongoose.Types.ObjectId(starter)
        } as any);

        return match;
    }

    // Obtener una partida por su ID
    async getMatch(id: string) {
        const match = await this.matchRepo.findById(id);
        if (!match) {
            const e: any = new Error("Partida no encontrada");
            e.status = 404;
            throw e;
        }
        return match;
    }

    // Listar todas las partidas
    async listMatches() {
        return this.matchRepo.findAll();
    }

    /**
     * makeMove: recibe el ID de la partida, el ID del jugador y su movimiento.
     * Valida que sea su turno, registra el movimiento y actualiza el estado.
     * También emite eventos en tiempo real a través de Socket.IO.
     */
    async makeMove(matchId: string, playerId: string, dto: MoveDto): Promise<IMatch | null> {
        const match = await this.matchRepo.findById(matchId);
        if (!match) {
            const e: any = new Error("Partida no encontrada");
            e.status = 404;
            throw e;
        }
        if (match.status === "FINISHED") {
            const e: any = new Error("La partida ya ha finalizado");
            e.status = 400;
            throw e;
        }

        // Validar que el jugador pertenezca a esta partida
        const playerIsA = match.playerA.toString() === playerId;
        const playerIsB = match.playerB.toString() === playerId;
        if (!playerIsA && !playerIsB) {
            const e: any = new Error("El jugador no pertenece a esta partida");
            e.status = 400;
            throw e;
        }

        // Validar turno actual
        if (!match.currentTurn) {
            match.currentTurn = match.playerA; // retroceder si no está definido
        }
        if (match.currentTurn.toString() !== playerId) {
            const e: any = new Error("No es tu turno");
            e.status = 400;
            throw e;
        }

        // Obtener la ronda actual o crear una nueva si no existe o ya está completa
        let currentRound = match.rounds.length > 0 ? match.rounds[match.rounds.length - 1] : null;
        if (!currentRound || currentRound.moves.length === 2) {
            currentRound = {
                roundNumber: match.rounds.length + 1,
                moves: [],
                winner: null
            } as any;
            match.rounds.push(currentRound as IRound);
        }

        if (!currentRound) {
            const e: any = new Error("No se pudo determinar la ronda actual");
            e.status = 500;
            throw e;
        }

        // Evitar movimientos duplicados en la misma ronda
        if (currentRound.moves.some(m => m.playerId.toString() === playerId)) {
            const e: any = new Error("El jugador ya realizó su movimiento en esta ronda");
            e.status = 400;
            throw e;
        }

        // Registrar el movimiento
        currentRound.moves.push({
            playerId: new mongoose.Types.ObjectId(playerId),
            move: dto.move,
            timestamp: new Date()
        } as any);

        // Intentar obtener instancia de Socket.IO
        const io = (() => {
            try { return getIo(); } catch { return null; }
        })();

        // Si ambos jugadores ya hicieron su movimiento, decidir el ganador de la ronda
        if (currentRound.moves.length === 2) {
            const [m1, m2] = currentRound.moves;
            // Cambié el return por throw para evitar que la función pueda devolver undefined
            if (!m1 || !m2) {
                const e: any = new Error("Datos de movimientos incompletos en la ronda");
                e.status = 500;
                throw e;
            }

            const playerAMove = match.playerA.equals(m1.playerId) ? m1.move : m2.move;
            const playerBMove = match.playerB.equals(m1.playerId) ? m1.move : m2.move;

            const result = decideWinner(playerAMove, playerBMove);

            if (result === 0) {
                currentRound.winner = null; // Empate
            } else if (result === 1) {
                currentRound.winner = match.playerA;
                match.score.playerA += 1;
            } else {
                currentRound.winner = match.playerB;
                match.score.playerB += 1;
            }

            // Emitir el resultado de la ronda a los clientes conectados
            if (io) io.to(matchId).emit("roundResult", {
                roundNumber: currentRound.roundNumber,
                winner: currentRound.winner ? currentRound.winner.toString() : null,
                moves: currentRound.moves.map(m => ({ playerId: m.playerId.toString(), move: m.move }))
            });

            // Verificar si alguien ya ganó la partida
            if (match.score.playerA >= this.roundsToWin || match.score.playerB >= this.roundsToWin) {
                match.status = "FINISHED";
                match.winner = match.score.playerA >= this.roundsToWin ? match.playerA : match.playerB;

                const winnerId = match.winner.toString();
                const loserId = winnerId === match.playerA.toString() ? match.playerB.toString() : match.playerA.toString();

                // Actualizar estadísticas de los jugadores
                await this.playerRepo.updateStats(winnerId, { $inc: { wins: 1 } } as any);
                await this.playerRepo.updateStats(loserId, { $inc: { losses: 1 } } as any);

                // Notificar a los clientes que la partida terminó
                if (io) io.to(matchId).emit("matchEnd", {
                    winner: match.winner.toString(),
                    score: match.score
                });
            } else {
                // Si la partida continúa, decidir quién inicia la siguiente ronda
                if (currentRound.winner === null) {
                    // En caso de empate, alternar turno
                    match.currentTurn = match.currentTurn.toString() === match.playerA.toString() ? match.playerB : match.playerA;
                } else {
                    // El ganador de la ronda empieza la siguiente
                    match.currentTurn = currentRound.winner;
                }
            }
        } else {
            // Si solo un jugador ha jugado, cambiar el turno al otro
            match.currentTurn = playerIsA ? match.playerB : match.playerA;
        }

        // Guardar cambios en la base de datos
        const updated = await this.matchRepo.update(match.id, match as any);

        // Normalizar el resultado para que sea exactamente IMatch | null (sin undefined ni Document)
        const result: IMatch | null = updated
            ? ((typeof (updated as any).toObject === "function") ? (updated as any).toObject() as IMatch : updated as IMatch)
            : null;

        // Emitir estado actualizado de la partida a los clientes (solo si tenemos result)
        if (io && result) io.to(matchId).emit("matchUpdate", { match: result });

        return result;
    }


    // Obtener historial de partidas de un jugador
    async listMatchesByPlayer(playerId: string) {
        return this.matchRepo.findByPlayer(playerId);
    }
}
