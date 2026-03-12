import { Router } from "express";
import { CoverLetterController } from "../controllers/coverLetter.controller";

const router = Router();

router.post("/draft", CoverLetterController.createDraft);
router.post("/chat/prompts", CoverLetterController.createDynamicQuestionPrompts);
router.post("/custom-sets", CoverLetterController.createCustomSet);
router.post("/custom-chat/reset", CoverLetterController.resetCustomChat);
router.post("/custom-chat/:questionId", CoverLetterController.chatCustomQuestion);

export default router;
