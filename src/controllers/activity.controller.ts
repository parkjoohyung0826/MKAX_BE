import { Request, Response } from "express";
import { z } from "zod";
import {
  recommendActivityFromUserInput,
  recommendSeniorTrainingFromUserInput,
} from "../services/activity.service";
import { RecommendSection } from "@prisma/client";
import {
  getRecommendState,
  saveRecommendState,
} from "../repositories/recommendChat.repository";

const ActivitySchema = z.object({
  userInput: z.string(),
});

export async function recommendActivityController(req: Request, res: Response) {
  const parsed = ActivitySchema.safeParse(req.body);

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
    const { userInput } = parsed.data;
    const stored = await getRecommendState(
      req.sessionId,
      RecommendSection.ACTIVITY
    );
    const mergedInput = [stored?.accumulatedInput, userInput]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .join("\n");
    const data = await recommendActivityFromUserInput(mergedInput);
    await saveRecommendState(
      req.sessionId,
      RecommendSection.ACTIVITY,
      data.isComplete ? "" : mergedInput
    );

    // 로그 확인하고 싶으면 여기서 찍는 게 제일 확실함
    console.log("[POST /api/recommend/activity] ok");

    return res.json(data);
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
  const parsed = ActivitySchema.safeParse(req.body);

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
    const { userInput } = parsed.data;
    const stored = await getRecommendState(
      req.sessionId,
      RecommendSection.ACTIVITY
    );
    const mergedInput = [stored?.accumulatedInput, userInput]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .join("\n");
    const data = await recommendSeniorTrainingFromUserInput(mergedInput);
    await saveRecommendState(
      req.sessionId,
      RecommendSection.ACTIVITY,
      data.isComplete ? "" : mergedInput
    );

    return res.json(data);
  } catch (e: any) {
    console.error("[POST /api/recommend/senior-training] error:", e);
    return res.status(500).json({
      message: "Failed to recommend senior training",
    });
  }
}
