import { CreatePlayerDto } from "../dtos/player.dto";
import { IPlayerService } from "../models/IPlayerService";
import { PlayerRepository } from "../repositories/PlayerRepository";

export class PlayerService implements IPlayerService {
  private repo = new PlayerRepository();

  async createPlayer(dto: CreatePlayerDto) {
    const exists = await this.repo.findByName(dto.name);
    if (exists) {
      const e: any = new Error("El nombre del jugador(a) ya fue registrado");
      e.status = 400;
      throw e;
    }
    return this.repo.create(dto.name);
  }

  async getAllPlayers() {
    return this.repo.findAll();
  }

  async getStats(id: string) {
    const player = await this.repo.findById(id);
    if (!player) {
      const e: any = new Error("Jugador(a) no encontrado(a)");
      e.status = 404;
      throw e;
    }
    return {
      id: player.id,
      name: player.name,
      wins: player.wins,
      losses: player.losses,
      draws: player.draws,
      createdAt: player.createdAt
    };
  }
}