import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  chatMotivationAspiration,
  chatSeniorMotivationWorkReadiness,
} from "../services/motivationAspirationChat.service";

const MotivationAspirationChatSchema = z.object({
  userInput: z.string(),
  currentSummary: z.string().optional(),
});

export async function motivationAspirationChatController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = MotivationAspirationChatSchema.safeParse(req.body);
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
    const result = await chatMotivationAspiration({
      ...parsed.data,
      sessionId: req.sessionId,
    });
    return res.json(result);
  } catch (err) {
    console.error("🔥 Error in motivationAspirationChatController");
    return next(err);
  }
}

export async function seniorMotivationWorkReadinessChatController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = MotivationAspirationChatSchema.safeParse(req.body);
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
    const result = await chatSeniorMotivationWorkReadiness({
      ...parsed.data,
      sessionId: req.sessionId,
    });
    return res.json(result);
  } catch (err) {
    console.error("🔥 Error in seniorMotivationWorkReadinessChatController");
    return next(err);
  }
}
