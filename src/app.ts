import express from "express";
import itemRoutes from "./routes/item.routes";
import jobRoutes from "./routes/job.routes";
import educationRoutes from "./routes/education.routes";
import careerRoutes from "./routes/career.routes";
import activityRoutes from "./routes/activity.routes";
import certificationRoutes from "./routes/certification.routes";
import coverLetterRoutes from "./routes/coverLetter.routes";
import profileRoutes from "./routes/profile.routes";
import resumeFormatRoutes from "./routes/resumeFormat.routes";
import analysisReportRoutes from "./routes/analysisReport.routes";
import recruitmentMatchRoutes from "./routes/recruitmentMatch.routes";
import recommendChatRoutes from "./routes/recommendChat.routes";
import growthProcessChatRoutes from "./routes/growthProcessChat.routes";
import personalityChatRoutes from "./routes/personalityChat.routes";
import careerStrengthChatRoutes from "./routes/careerStrengthChat.routes";
import motivationAspirationChatRoutes from "./routes/motivationAspirationChat.routes";
import coverLetterChatRoutes from "./routes/coverLetterChat.routes";
import archiveRoutes from "./routes/archive.routes";
import uploadRoutes from "./routes/upload.routes";

import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler";
import { anonymousSession } from "./middlewares/anonymousSession";

const app = express();

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((value) => value.trim())
  : true;
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: "3mb" }));
app.use(anonymousSession);

([
  ["/items", itemRoutes],
  ["/api/recommend", jobRoutes],
  ["/api/recommend", educationRoutes],
  ["/api/recommend", careerRoutes],
  ["/api/recommend", activityRoutes],
  ["/api/recommend", certificationRoutes],
  ["/api/recommend", profileRoutes],
  ["/api/recommend", resumeFormatRoutes],
  ["/api/report", analysisReportRoutes],
  ["/api/report", recruitmentMatchRoutes],
  ["/api/recommend", recommendChatRoutes],
  ["/api/cover-letter", coverLetterRoutes],
  ["/api/cover-letter", growthProcessChatRoutes],
  ["/api/cover-letter", personalityChatRoutes],
  ["/api/cover-letter", careerStrengthChatRoutes],
  ["/api/cover-letter", motivationAspirationChatRoutes],
  ["/api/cover-letter", coverLetterChatRoutes],
  ["/api/archive", archiveRoutes],
  ["/api/uploads", uploadRoutes],
] as const).forEach(([path, router]) => {
  app.use(path, router);
});

app.use(errorHandler);

export default app;
