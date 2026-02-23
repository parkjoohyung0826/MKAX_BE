import { Router } from "express";
import {
  growthProcessChatController,
  seniorCareerSummaryLifeViewChatController,
} from "../controllers/growthProcessChat.controller";

const router = Router();

router.post("/growth-process", growthProcessChatController);
router.post("/senior-career-summary-life-view", seniorCareerSummaryLifeViewChatController);
router.post("/senior/career-summary", seniorCareerSummaryLifeViewChatController);

export default router;
