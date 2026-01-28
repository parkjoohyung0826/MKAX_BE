import { Router } from "express";
import { resetCoverLetterChatController } from "../controllers/coverLetterChat.controller";

const router = Router();

// POST /api/cover-letter/chat/reset
// body: { section?: "GROWTH_PROCESS" | "PERSONALITY" | "CAREER_STRENGTH" | "MOTIVATION_ASPIRATION" }
router.post("/chat/reset", resetCoverLetterChatController);

export default router;
