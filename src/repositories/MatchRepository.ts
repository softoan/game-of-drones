
import { Types } from "mongoose";
import { IMatch, MatchModel } from "../models/IMatch";

export class MatchRepository {
    async create(match: Partial<IMatch>) {
        const m = new MatchModel(match);
        return m.save();
    }

    async findById(id: string) {
        return MatchModel.findById(id).exec();
    }

    async findAll() {
        return MatchModel.find().exec();
    }

    async update(id: string, update: Partial<IMatch>) {
        return MatchModel.findByIdAndUpdate(id, update, { new: true }).exec();
    }

    async findByPlayer(playerId: string) {
        return MatchModel.find({
            $or: [{ playerA: new Types.ObjectId(playerId) }, { playerB: new Types.ObjectId(playerId) }]
        }).exec();
    }

    async findActiveBetween(playerA: string, playerB: string) {
        const a = new Types.ObjectId(playerA);
        const b = new Types.ObjectId(playerB);

        return MatchModel.findOne({
            status: { $ne: "FINISHED" },
            $or: [
                { playerA: a, playerB: b },
                { playerA: b, playerB: a }
            ]
        }).exec();
    }

}
