import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { chatPersonality } from "../services/personalityChat.service";

const PersonalityChatSchema = z.object({
  userInput: z.string(),
  currentSummary: z.string().optional(),
});

export async function personalityChatController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = PersonalityChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const result = await chatPersonality(parsed.data);
    return res.json(result);
  } catch (err) {
    console.error("🔥 Error in personalityChatController");
    return next(err);
  }
}
