import { Request, Response } from "express";
import { z } from "zod";
import { recommendCareerFromInput } from "../services/career.service";
import { RecommendSection } from "@prisma/client";
import {
  getRecommendState,
  saveRecommendState,
} from "../repositories/recommendChat.repository";

const CareerSchema = z.object({
  userInput: z.string(),
});

export async function recommendCareerController(req: Request, res: Response) {
  const parsed = CareerSchema.safeParse(req.body);

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
    const stored = await getRecommendState(
      req.sessionId,
      RecommendSection.CAREER
    );
    const mergedInput = [stored?.accumulatedInput, parsed.data.userInput]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .join("\n");
    const result = await recommendCareerFromInput(mergedInput);
    await saveRecommendState(
      req.sessionId,
      RecommendSection.CAREER,
      result.isComplete ? "" : mergedInput
    );
    return res.json(result);
  } catch (e: any) {
    console.error("[Career AI Error]", e);
    return res.status(500).json({
      message: "Failed to generate career description",
    });
  }
}
