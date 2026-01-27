import { Router } from "express";
import { careerStrengthChatController } from "../controllers/careerStrengthChat.controller";

const router = Router();

router.post("/career-strength", careerStrengthChatController);

export default router;
