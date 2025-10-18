import { IsNotEmpty, IsString } from "class-validator";

export class CreatePlayerDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
