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

import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler";
import { anonymousSession } from "./middlewares/anonymousSession";

const app = express();

app.use(errorHandler);

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((value) => value.trim())
  : true;
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: "3mb" }));
app.use(anonymousSession);

app.use("/items", itemRoutes);
app.use("/api/recommend", jobRoutes);
app.use("/api/recommend", educationRoutes);
app.use("/api/recommend", careerRoutes);
app.use("/api/recommend", activityRoutes);
app.use("/api/recommend", certificationRoutes);
app.use("/api/recommend", profileRoutes);
app.use("/api/recommend", resumeFormatRoutes);
app.use("/api/report", analysisReportRoutes);
app.use("/api/report", recruitmentMatchRoutes);
app.use("/api/recommend", recommendChatRoutes);
app.use("/api/cover-letter", coverLetterRoutes);
app.use("/api/cover-letter", growthProcessChatRoutes);
app.use("/api/cover-letter", personalityChatRoutes);
app.use("/api/cover-letter", careerStrengthChatRoutes);
app.use("/api/cover-letter", motivationAspirationChatRoutes);
app.use("/api/cover-letter", coverLetterChatRoutes);
app.use("/api/archive", archiveRoutes);


app.use(errorHandler);

export default app;
