import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type { ClassConstructor } from "class-transformer";

export const validateDto = (dtoClass: ClassConstructor<any>) => {
  return async (req: any, res: any, next: any) => {
    const dtoObj = plainToInstance(dtoClass, req.body);
    const errors = await validate(dtoObj as object);
    if (errors.length > 0) {
      const messages = errors.flatMap(e => Object.values(e.constraints || {}));
      return res.status(400).json({ error: true, message: messages });
    }
    next();
  };
};
