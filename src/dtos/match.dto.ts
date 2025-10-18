import { IsNotEmpty, IsString } from "class-validator";
import { Types } from "mongoose";

export class CreateMatchDto {
  @IsNotEmpty()
  playerA!: string;

  @IsNotEmpty()
  playerB!: string;
}

export class MoveDto {
  @IsString()
  @IsNotEmpty()
  move!: "ROCK" | "PAPER" | "SCISSORS";
}
