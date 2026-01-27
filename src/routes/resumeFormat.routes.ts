import { Router } from "express";
import { formatResumeController } from "../controllers/resumeFormat.controller";

const router = Router();

router.post("/format", formatResumeController);

export default router;
