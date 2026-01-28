import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { recommendProfileFromDescription } from "../services/profile.service";
import { RecommendSection } from "@prisma/client";
import {
  getRecommendState,
  saveRecommendState,
} from "../repositories/recommendChat.repository";

const ProfileSchema = z.object({
  description: z.string(),
});

export async function recommendProfileController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = ProfileSchema.safeParse(req.body);
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
    const { description } = parsed.data;
    const stored = await getRecommendState(
      req.sessionId,
      RecommendSection.PROFILE
    );
    const mergedDescription = [stored?.accumulatedInput, description]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .join("\n");
    const data = await recommendProfileFromDescription(mergedDescription);
    await saveRecommendState(
      req.sessionId,
      RecommendSection.PROFILE,
      mergedDescription
    );
    return res.json(data);
  } catch (err) {
    console.error("🔥 Error in recommendProfileController");
    next(err);
  }
}
