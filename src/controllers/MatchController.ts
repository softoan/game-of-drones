import { Request, Response } from "express";
import { MatchService } from "../services/MatchService";
import { plainToInstance } from "class-transformer";
import { CreateMatchDto, MoveDto } from "../dtos/match.dto";

const service = new MatchService();

export class MatchController {
    static async create(req: Request, res: Response) {
        try {
            const dto = plainToInstance(CreateMatchDto, req.body);
            const match = await service.createMatch(dto);
            return res.status(201).json({ error: false, data: match });
        } catch (err: any) {
            return res.status(err.status || 500).json({ error: true, message: err.message });
        }
    }

    static async list(req: Request, res: Response) {
        const matches = await service.listMatches();
        return res.json({ error: false, data: matches });
    }

    static async get(req: Request, res: Response) {
        try {
            const match = await service.getMatch(req.params.id ?? '');
            return res.json({ error: false, data: match });
        } catch (err: any) {
            return res.status(err.status || 500).json({ error: true, message: err.message });
        }
    }

    static async move(req: Request, res: Response) {
        try {
            const dto = plainToInstance(MoveDto, req.body);
            const playerId = req.body.playerId || req.query.playerId || req.headers["x-player-id"];
            if (!playerId) {
                return res.status(400).json({ error: true, message: "playerId requerido" });
            }
            const updated = await service.makeMove((req.params.id ?? ''), String(playerId), dto);
            return res.json({ error: false, data: updated });
        } catch (err: any) {
            return res.status(err.status || 500).json({ error: true, message: err.message });
        }
    }

    static async listByPlayer(req: Request, res: Response) {
        try {
            const matches = await service.listMatchesByPlayer(req.params.playerId ?? '');
            return res.json({ error: false, data: matches });
        } catch (err: any) {
            return res.status(err.status || 500).json({ error: true, message: err.message });
        }
    }

    static async joinMatch(req: Request, res: Response) {
        try {
            const match = await service.getMatch((req.params.id ?? ''));
            return res.status(200).json({ error: false, data: match });
        } catch (err: any) {
            return res.status(err.status || 500).json({ error: true, message: err.message });
        }
    }
}
