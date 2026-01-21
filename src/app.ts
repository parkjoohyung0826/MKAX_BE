import express from "express";
import itemRoutes from "./routes/item.routes";
import jobRoutes from "./routes/job.routes";
import educationRoutes from "./routes/education.routes";
import careerRoutes from "./routes/career.routes";
import activityRoutes from "./routes/activity.routes";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.use(errorHandler);

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.use("/items", itemRoutes);
app.use("/api/recommend", jobRoutes);
app.use("/api/recommend", educationRoutes);
app.use("/api/recommend", careerRoutes);
app.use("/api/recommend", activityRoutes);

app.use(errorHandler);

export default app;
