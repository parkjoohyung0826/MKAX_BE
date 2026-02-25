import { Router } from "express";
import { resetCoverLetterChatController } from "../controllers/coverLetterChat.controller";

const router = Router();

router.post("/chat/reset", resetCoverLetterChatController);

export default router;
