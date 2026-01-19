import { Router } from "express";
import { prisma } from "../infra/db/prisma";

const router = Router();

router.get("/", async (_, res) => {
  const items = await prisma.item.findMany({ orderBy: { id: "desc" } });
  res.json(items);
});

router.post("/", async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ message: "title is required" });

  const item = await prisma.item.create({ data: { title } });
  res.status(201).json(item);
});

export default router;