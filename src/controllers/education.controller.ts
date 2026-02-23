import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { recommendEducationFromDescription } from "../services/education.service";
import { RecommendSection } from "@prisma/client";
import {
  buildMergedRecommendInput,
  parseRequestBody,
  requireSessionId,
  saveRecommendAccumulatedInput,
} from "../common/controllerHelpers";

const EducationSchema = z.object({
  description: z.string(),
});

export async function recommendEducationController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const bodyData = parseRequestBody(EducationSchema, req, res);
  if (!bodyData) return;

  try {
    const sessionId = requireSessionId(req, res);
    if (!sessionId) return;
    const mergedDescription = await buildMergedRecommendInput(
      sessionId,
      RecommendSection.EDUCATION,
      bodyData.description
    );
    const result = await recommendEducationFromDescription(mergedDescription);
    await saveRecommendAccumulatedInput(
      sessionId,
      RecommendSection.EDUCATION,
      mergedDescription,
      result.isComplete
    );
    return res.json(result);
  } catch (err) {
    console.error("🔥 Error in recommendEducationController");
    next(err);
  }
}
