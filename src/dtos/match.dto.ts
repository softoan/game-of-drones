import { IsIn, IsNotEmpty, IsString } from "class-validator";
import { Types } from "mongoose";

export class CreateMatchDto {
  @IsNotEmpty()
  playerA!: string;

  @IsNotEmpty()
  playerB!: string;
}

export class MoveDto {
  @IsString({ message: "El movimiento debe ser una cadena de texto" })
  @IsNotEmpty({ message: "El movimiento es obligatorio" })
  @IsIn(["ROCK", "PAPER", "SCISSORS"], {
    message: "Movimiento no válido. Debe ser ROCK, PAPER o SCISSORS",
  })
  move!: "ROCK" | "PAPER" | "SCISSORS";
}