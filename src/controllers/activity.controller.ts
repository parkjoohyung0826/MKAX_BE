import { Request, Response } from "express";
import { z } from "zod";
import {
  recommendActivityFromUserInput,
  recommendSeniorTrainingFromUserInput,
} from "../services/activity.service";
import { RecommendSection } from "@prisma/client";
import {
  buildMergedRecommendInput,
  parseRequestBody,
  requireSessionId,
  saveRecommendAccumulatedInput,
} from "../common/controllerHelpers";

const ActivitySchema = z.object({
  userInput: z.string(),
});

export async function recommendActivityController(req: Request, res: Response) {
  const bodyData = parseRequestBody(ActivitySchema, req, res);
  if (!bodyData) return;

  try {
    const sessionId = requireSessionId(req, res);
    if (!sessionId) return;
    const mergedInput = await buildMergedRecommendInput(
      sessionId,
      RecommendSection.ACTIVITY,
      bodyData.userInput
    );
    const result = await recommendActivityFromUserInput(mergedInput);
    await saveRecommendAccumulatedInput(
      sessionId,
      RecommendSection.ACTIVITY,
      mergedInput,
      result.isComplete
    );

    return res.json(result);
  } catch (e: any) {
    console.error("[POST /api/recommend/activity] error:", e);
    return res.status(500).json({
      message: "Failed to recommend activity",
    });
  }
}

export async function recommendSeniorTrainingController(
  req: Request,
  res: Response
) {
  const bodyData = parseRequestBody(ActivitySchema, req, res);
  if (!bodyData) return;

  try {
    const sessionId = requireSessionId(req, res);
    if (!sessionId) return;
    const mergedInput = await buildMergedRecommendInput(
      sessionId,
      RecommendSection.ACTIVITY,
      bodyData.userInput
    );
    const result = await recommendSeniorTrainingFromUserInput(mergedInput);
    await saveRecommendAccumulatedInput(
      sessionId,
      RecommendSection.ACTIVITY,
      mergedInput,
      result.isComplete
    );

    return res.json(result);
  } catch (e: any) {
    console.error("[POST /api/recommend/senior-training] error:", e);
    return res.status(500).json({
      message: "Failed to recommend senior training",
    });
  }
}
