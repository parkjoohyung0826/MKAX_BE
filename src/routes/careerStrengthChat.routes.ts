import { Router } from "express";
import {
  careerStrengthChatController,
  seniorCoreSkillsChatController,
} from "../controllers/careerStrengthChat.controller";

const router = Router();

router.post("/career-strength", careerStrengthChatController);
router.post("/senior-core-skills", seniorCoreSkillsChatController);
router.post("/senior/skills", seniorCoreSkillsChatController);

export default router;
