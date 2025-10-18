import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { PlayerService } from "../services/PlayerService";
import { CreatePlayerDto } from "../dtos/player.dto";

const service = new PlayerService();

export class PlayerController {
    static async create(req: Request, res: Response) {
        try {
            const dto = plainToInstance(CreatePlayerDto, req.body);
            const player = await service.createPlayer(dto);
            return res.status(201).json({ error: false, data: player });
        } catch (err: any) {
            return res.status(err.status || 500).json({ error: true, message: err.message });
        }
    }

    static async list(req: Request, res: Response) {
        const players = await service.getAllPlayers();
        return res.json({ error: false, data: players });
    }

    static async stats(req: Request, res: Response) {
        try {
            const stats = await service.getStats((req.params.id ?? ''));
            return res.json({ error: false, data: stats });
        } catch (err: any) {
            return res.status(err.status || 500).json({ error: true, message: err.message });
        }
    }
}
