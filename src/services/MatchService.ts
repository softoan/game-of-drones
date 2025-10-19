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
        const ROUNDS_TO_WIN = 3; // Primer jugador en ganar 3 rondas gana la partida

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

        // Validar que el jugador pertenezca a la partida
        const playerIsA = match.playerA.toString() === playerId;
        const playerIsB = match.playerB.toString() === playerId;
        if (!playerIsA && !playerIsB) {
            const e: any = new Error("El jugador no pertenece a esta partida");
            e.status = 400;
            throw e;
        }

        // Validar turno actual
        if (!match.currentTurn) {
            match.currentTurn = match.playerA; // Si no hay turno definido, comienza jugador A
        }
        if (match.currentTurn.toString() !== playerId) {
            const e: any = new Error("No es tu turno");
            e.status = 400;
            throw e;
        }

        // Obtener la ronda actual o crear una nueva si no existe o ya está completa
        let currentRound = match.rounds.length > 0 ? match.rounds[match.rounds.length - 1] : null;
        if (!currentRound || currentRound.moves.length === 2) {
            const newRound = {
                roundNumber: match.rounds.length + 1,
                moves: [],
                winner: null
            } as IRound;

            match.rounds.push(newRound);
            currentRound = newRound;
        }

        // Evitar movimientos duplicados en la misma ronda
        if (currentRound.moves.some(m => m.playerId.toString() === playerId.toString())) {
            const e: any = new Error("El jugador ya realizó su movimiento en esta ronda");
            e.status = 400;
            throw e;
        }

        // Registrar el movimiento en la ronda actual (usando referencia directa)
        const lastRound = match.rounds.at(-1)!;
        lastRound.moves.push({
            playerId: new mongoose.Types.ObjectId(playerId),
            move: dto.move,
            timestamp: new Date()
        });

        // Intentar obtener instancia de Socket.IO
        const io = (() => {
            try { return getIo(); } catch { return null; }
        })();

        // Si ambos jugadores ya hicieron su movimiento, decidir el ganador de la ronda
        const activeRound = match.rounds[match.rounds.length - 1];
        if (activeRound?.moves.length === 2) {
            const [m1, m2] = activeRound.moves;
            if (!m1 || !m2) {
                const e: any = new Error("Datos de movimientos incompletos en la ronda");
                e.status = 500;
                throw e;
            }

            const playerAMove = match.playerA.equals(m1.playerId) ? m1.move : m2.move;
            const playerBMove = match.playerB.equals(m1.playerId) ? m1.move : m2.move;
            const result = decideWinner(playerAMove, playerBMove);

            // Determinar resultado de la ronda
            if (result === 0) {
                activeRound.winner = null;
            } else if (result === 1) {
                activeRound.winner = match.playerA;
                match.score.playerA += 1;
            } else {
                activeRound.winner = match.playerB;
                match.score.playerB += 1;
            }

            // Emitir resultado de la ronda
            if (io) io.to(matchId).emit("roundResult", {
                roundNumber: activeRound.roundNumber,
                winner: activeRound.winner ? activeRound.winner.toString() : null,
                moves: activeRound.moves.map(m => ({ playerId: m.playerId.toString(), move: m.move }))
            });

            // Verificar si alguien ganó la partida (3 rondas)
            if (match.score.playerA >= ROUNDS_TO_WIN || match.score.playerB >= ROUNDS_TO_WIN) {
                match.status = "FINISHED";
                match.winner = match.score.playerA >= ROUNDS_TO_WIN ? match.playerA : match.playerB;

                const winnerId = match.winner.toString();
                const loserId = winnerId === match.playerA.toString() ? match.playerB.toString() : match.playerA.toString();

                // Actualizar estadísticas
                await this.playerRepo.updateStats(winnerId, { $inc: { wins: 1 } } as any);
                await this.playerRepo.updateStats(loserId, { $inc: { losses: 1 } } as any);

                // Notificar fin de partida
                if (io) io.to(matchId).emit("matchEnd", {
                    winner: match.winner.toString(),
                    score: match.score
                });
            } else {
                // Si la partida continúa
                if (activeRound?.winner === null) {
                    // Empate → alternar turno
                    match.currentTurn = match.currentTurn.toString() === match.playerA.toString()
                        ? match.playerB
                        : match.playerA;
                } else {
                    // Gana el que empieza siguiente
                    match.currentTurn = activeRound?.winner ?? null;
                }
            }
        } else {
            // Si solo un jugador ha jugado, cambiar turno
            match.currentTurn = playerIsA ? match.playerB : match.playerA;
        }

        // Forzar que Mongoose detecte cambios en las rondas
        match.markModified("rounds");

        // Guardar cambios
        const updated = await this.matchRepo.update(match.id, match as any);

        // Normalizar resultado a IMatch
        const result: IMatch | null = updated
            ? ((typeof (updated as any).toObject === "function")
                ? (updated as any).toObject() as IMatch
                : updated as IMatch)
            : null;

        // Emitir actualización global del estado de la partida
        if (io && result) io.to(matchId).emit("matchUpdate", { match: result });

        return result;
    }

    // Obtener historial de partidas de un jugador
    async listMatchesByPlayer(playerId: string) {
        return this.matchRepo.findByPlayer(playerId);
    }
}