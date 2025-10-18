import mongoose, { Schema, Document, Types } from "mongoose";

export type Move = "ROCK" | "PAPER" | "SCISSORS";
export type MatchStatus = "WAITING" | "ONGOING" | "FINISHED";
/*
* Los posibles valores son:
* 
* - "WAITING" =>  artida está creada
* -"ONGOING" => Partida en curso;
* -"FINISHED"=> Partida ha terminado
*/
export interface IRound {
  roundNumber: number;
  moves: {
    playerId: Types.ObjectId;
    move: Move;
    timestamp: Date;
  }[];
  winner?: Types.ObjectId | null;
}

export interface IMatch extends Document {
  playerA: Types.ObjectId;
  playerB: Types.ObjectId;
  rounds: IRound[];
  score: {
    playerA: number;
    playerB: number;
  };
  status: MatchStatus;
  currentTurn: Types.ObjectId | null; // quién debe jugar ahora (playerA or playerB)
  winner?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const RoundMoveSchema = new Schema({
  playerId: { type: Schema.Types.ObjectId, ref: "Player", required: true },
  move: { type: String, enum: ["ROCK", "PAPER", "SCISSORS"], required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const RoundSchema = new Schema({
  roundNumber: { type: Number, required: true },
  moves: { type: [RoundMoveSchema], default: [] },
  winner: { type: Schema.Types.ObjectId, ref: "Player", default: null }
}, { _id: false });

const MatchSchema = new Schema({
  playerA: { type: Schema.Types.ObjectId, ref: "Player", required: true },
  playerB: { type: Schema.Types.ObjectId, ref: "Player", required: true },
  rounds: { type: [RoundSchema], default: [] },
  score: {
    playerA: { type: Number, default: 0 },
    playerB: { type: Number, default: 0 }
  },
  status: { type: String, enum: ["WAITING", "ONGOING", "FINISHED"], default: "WAITING" },
  currentTurn: { type: Schema.Types.ObjectId, ref: "Player", default: null },
  winner: { type: Schema.Types.ObjectId, ref: "Player", default: null }
}, { timestamps: true });

export const MatchModel = mongoose.model<IMatch>("Match", MatchSchema);
