import { Request, Response } from "express";
import { z } from "zod";
import { recommendCareerFromInput } from "../services/career.service";
import { RecommendSection } from "@prisma/client";
import {
  buildMergedRecommendInput,
  parseRequestBody,
  requireSessionId,
  saveRecommendAccumulatedInput,
} from "../common/controllerHelpers";

const CareerSchema = z.object({
  userInput: z.string(),
});

export async function recommendCareerController(req: Request, res: Response) {
  const bodyData = parseRequestBody(CareerSchema, req, res);
  if (!bodyData) return;

  try {
    const sessionId = requireSessionId(req, res);
    if (!sessionId) return;
    const mergedInput = await buildMergedRecommendInput(
      sessionId,
      RecommendSection.CAREER,
      bodyData.userInput
    );
    const result = await recommendCareerFromInput(mergedInput);
    await saveRecommendAccumulatedInput(
      sessionId,
      RecommendSection.CAREER,
      mergedInput,
      result.isComplete
    );
    return res.json(result);
  } catch (e: any) {
    console.error("[Career AI Error]", e);
    return res.status(500).json({
      message: "Failed to generate career description",
    });
  }
}
