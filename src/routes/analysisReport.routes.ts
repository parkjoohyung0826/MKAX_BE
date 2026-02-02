import { Router } from "express";
import { analysisReportController } from "../controllers/analysisReport.controller";

const router = Router();

router.post("/analysis-report", analysisReportController);

export default router;
