import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { chatGrowthProcess } from "../services/growthProcessChat.service";

const GrowthProcessChatSchema = z.object({
  userInput: z.string(),
  currentSummary: z.string().optional(),
});

export async function growthProcessChatController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = GrowthProcessChatSchema.safeParse(req.body);
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
    const result = await chatGrowthProcess({
      ...parsed.data,
      sessionId: req.sessionId,
    });
    return res.json(result);
  } catch (err) {
    console.error("🔥 Error in growthProcessChatController");
    return next(err);
  }
}
