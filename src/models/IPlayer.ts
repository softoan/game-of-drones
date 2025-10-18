import mongoose, { Schema, Document } from "mongoose";

export interface IPlayer extends Document {
  name: string;
  createdAt: Date;
  wins: number;
  losses: number;
  draws: number;
}

const PlayerSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const PlayerModel = mongoose.model<IPlayer>("Player", PlayerSchema);
