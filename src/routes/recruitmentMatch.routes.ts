import { Router } from "express";
import { matchRecruitmentsController } from "../controllers/recruitmentMatch.controller";

const router = Router();

router.post("/recruitments/match", matchRecruitmentsController);

export default router;
