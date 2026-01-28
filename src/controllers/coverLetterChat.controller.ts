import { Request, Response, NextFunction } from "express";
import { resetChatSession } from "../repositories/coverLetterChat.repository";
import { z } from "zod";
import { CoverLetterSection } from "@prisma/client";

const ResetSchema = z.object({
  section: z.nativeEnum(CoverLetterSection).optional(),
});

export async function resetCoverLetterChatController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = ResetSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsed.error.flatten(),
      });
    }
    if (!req.sessionId) {
      return res.status(400).json({ message: "sessionId가 필요합니다." });
    }
    await resetChatSession(req.sessionId, parsed.data.section);
    return res.status(200).json({ message: "chat reset" });
  } catch (err) {
    console.error("🔥 Error in resetCoverLetterChatController");
    return next(err);
  }
}
