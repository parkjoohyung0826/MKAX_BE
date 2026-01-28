import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { RecommendSection } from "@prisma/client";
import { resetRecommendSession } from "../repositories/recommendChat.repository";

const ResetSchema = z.object({
  section: z.nativeEnum(RecommendSection).optional(),
});

export async function resetRecommendChatController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = ResetSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.flatten(),
    });
  }

  try {
    if (!req.sessionId) {
      return res.status(400).json({ message: "sessionId가 필요합니다." });
    }
    await resetRecommendSession(req.sessionId, parsed.data.section);
    return res.status(200).json({ message: "chat reset" });
  } catch (err) {
    console.error("🔥 Error in resetRecommendChatController");
    return next(err);
  }
}
