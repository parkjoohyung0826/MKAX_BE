import express from "express";
import itemRoutes from "./routes/item.routes";

const app = express();

app.use(express.json());

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.use("/items", itemRoutes);

export default app;