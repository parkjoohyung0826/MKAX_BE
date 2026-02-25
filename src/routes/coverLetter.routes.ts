import { Router } from "express";
import { CoverLetterController } from "../controllers/coverLetter.controller";

const router = Router();

router.post("/draft", CoverLetterController.createDraft);

export default router;
