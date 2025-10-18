import { IPlayer, PlayerModel } from "../models/IPlayer";


export class PlayerRepository {
  async create(name: string): Promise<IPlayer> {
    const player = new PlayerModel({ name });
    return player.save();
  }

  async findAll(): Promise<IPlayer[]> {
    return PlayerModel.find().exec();
  }

  async findById(id: string) {
    return PlayerModel.findById(id).exec();
  }

  async findByName(name: string) {
    return PlayerModel.findOne({ name }).exec();
  }

  async updateStats(id: string, update: Partial<IPlayer>) {
    return PlayerModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }
}
