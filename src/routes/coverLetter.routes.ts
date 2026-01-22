import { Router } from "express";
import { CoverLetterController } from "../controllers/coverLetter.controller";

const router = Router();

// POST /api/cover-letter/draft
router.post("/draft", CoverLetterController.createDraft);

export default router;
