import { Request, Response } from "express";
import { z } from "zod";
import { recommendCertificationFromInput } from "../services/certification.service";
import { RecommendSection } from "@prisma/client";
import {
  getRecommendState,
  saveRecommendState,
} from "../repositories/recommendChat.repository";

const RecommendCertificationSchema = z.object({
  userInput: z.string(),
});

export async function recommendCertificationController(req: Request, res: Response) {
  const parsed = RecommendCertificationSchema.safeParse(req.body);
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
      RecommendSection.CERTIFICATION
    );
    const mergedInput = [stored?.accumulatedInput, userInput]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .join("\n");
    const data = await recommendCertificationFromInput(mergedInput);
    await saveRecommendState(
      req.sessionId,
      RecommendSection.CERTIFICATION,
      data.isComplete ? "" : mergedInput
    );
    return res.json(data);
  } catch (e) {
    console.error("[recommendCertificationController]", e);
    return res.status(500).json({
      message: "Failed to recommend certification",
    });
  }
}
