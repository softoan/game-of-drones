import { Router } from "express";
import { validateDto } from "../middlewares/validateDto";
import { CreatePlayerDto } from "../dtos/player.dto";
import { PlayerController } from "../controllers/PlayerController";
import { CreateMatchDto, MoveDto } from "../dtos/match.dto";
import { MatchController } from "../controllers/MatchController";

const router = Router();
router.post("/players", validateDto(CreatePlayerDto), PlayerController.create);
router.get("/players", PlayerController.list);
router.get("/players/:id/stats", PlayerController.stats);

router.post("/matches", validateDto(CreateMatchDto), MatchController.create);
router.get("/matches", MatchController.list);
router.get("/matches/:id", MatchController.get);
router.post("/matches/:id/move", validateDto(MoveDto), MatchController.move);

export default router;
