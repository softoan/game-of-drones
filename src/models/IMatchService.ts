import { CreateMatchDto, MoveDto } from "../dtos/match.dto";
import { IMatch } from "../models/IMatch";

export interface IMatchService {

    // * Crea una nueva partida entre dos jugadores.

    createMatch(dto: CreateMatchDto): Promise<IMatch>;

    // * Obtiene una partida por su ID.
    getMatch(id: string): Promise<IMatch>;


    // * Lista todas las partidas existentes.
    listMatches(): Promise<IMatch[]>;

    /**
     * Registra el movimiento de un jugador en una partida.
     * Valida turno, pertenencia y estado de la partida.
     * Actualiza y emite los resultados mediante Socket.IO.
     */
    makeMove(matchId: string, playerId: string, dto: MoveDto): Promise<IMatch | null>;


    // * Obtiene el historial de partidas de un jugador.
    listMatchesByPlayer(playerId: string): Promise<IMatch[]>;
}
