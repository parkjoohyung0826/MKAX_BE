import { Router } from "express";
import { resetRecommendChatController } from "../controllers/recommendChat.controller";

const router = Router();

// POST /api/recommend/chat/reset
// body: { section?: "PROFILE" | "EDUCATION" | "CAREER" | "ACTIVITY" | "CERTIFICATION" }
router.post("/chat/reset", resetRecommendChatController);

export default router;
