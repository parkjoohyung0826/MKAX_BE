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
import growthProcessChatRoutes from "./routes/growthProcessChat.routes";
import personalityChatRoutes from "./routes/personalityChat.routes";
import careerStrengthChatRoutes from "./routes/careerStrengthChat.routes";
import motivationAspirationChatRoutes from "./routes/motivationAspirationChat.routes";

import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.use(errorHandler);

app.use(cors());
app.use(express.json());

app.use("/items", itemRoutes);
app.use("/api/recommend", jobRoutes);
app.use("/api/recommend", educationRoutes);
app.use("/api/recommend", careerRoutes);
app.use("/api/recommend", activityRoutes);
app.use("/api/recommend", certificationRoutes);
app.use("/api/recommend", profileRoutes);
app.use("/api/recommend", resumeFormatRoutes);
app.use("/api/cover-letter", coverLetterRoutes);
app.use("/api/cover-letter", growthProcessChatRoutes);
app.use("/api/cover-letter", personalityChatRoutes);
app.use("/api/cover-letter", careerStrengthChatRoutes);
app.use("/api/cover-letter", motivationAspirationChatRoutes);


app.use(errorHandler);

export default app;
