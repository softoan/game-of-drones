import { Types } from "mongoose";
import { Move } from "../models/IMatch";

/**
 * Returns:
* - 0 por empate
* - 1 si gana A
* - 2 si gana B
 */
export function decideWinner(a: Move, b: Move): 0 | 1 | 2 {
  if (a === b) return 0;
  if (a === "PAPER" && b === "ROCK") return 1;
  if (a === "ROCK" && b === "SCISSORS") return 1;
  if (a === "SCISSORS" && b === "PAPER") return 1;
  return 2;
}
