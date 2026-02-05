import { Router } from "express";
import {
  analysisReportController,
  analysisReportPdfController,
} from "../controllers/analysisReport.controller";
import { uploadPdfFields } from "../middlewares/pdfUpload";

const router = Router();

router.post("/analysis-report", analysisReportController);
router.post("/analysis-report/pdf", uploadPdfFields, analysisReportPdfController);

export default router;
