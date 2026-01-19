import express from "express";
import itemRoutes from "./routes/item.routes";
import cors from "cors";


const app = express();

app.use(cors());

app.use(express.json());

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.use("/items", itemRoutes);


export default app;