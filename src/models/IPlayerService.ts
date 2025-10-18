import { CreatePlayerDto } from "../dtos/player.dto";
import { IPlayer } from "../models/IPlayer";

export interface IPlayerService {

    createPlayer(dto: CreatePlayerDto): Promise<IPlayer>;

    getAllPlayers(): Promise<IPlayer[]>;

    getStats(id: string): Promise<{
        id: string;
        name: string;
        wins: number;
        losses: number;
        draws: number;
        createdAt: Date;
    }>;
}
