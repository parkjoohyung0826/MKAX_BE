import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { recommendProfileFromDescription } from "../services/profile.service";
import { RecommendSection } from "@prisma/client";
import {
  buildMergedRecommendInput,
  parseRequestBody,
  requireSessionId,
  saveRecommendAccumulatedInput,
} from "../common/controllerHelpers";

const ProfileSchema = z.object({
  description: z.string(),
});

export async function recommendProfileController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const bodyData = parseRequestBody(ProfileSchema, req, res);
  if (!bodyData) return;

  try {
    const sessionId = requireSessionId(req, res);
    if (!sessionId) return;
    const mergedDescription = await buildMergedRecommendInput(
      sessionId,
      RecommendSection.PROFILE,
      bodyData.description
    );
    const result = await recommendProfileFromDescription(mergedDescription);
    await saveRecommendAccumulatedInput(
      sessionId,
      RecommendSection.PROFILE,
      mergedDescription,
      false
    );
    return res.json(result);
  } catch (err) {
    console.error("🔥 Error in recommendProfileController");
    next(err);
  }
}
