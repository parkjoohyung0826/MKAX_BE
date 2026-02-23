import { Request, Response } from "express";
import { z } from "zod";
import {
  recommendCertificationFromInput,
  recommendSeniorLicenseSkillFromInput,
} from "../services/certification.service";
import { RecommendSection } from "@prisma/client";
import {
  buildMergedRecommendInput,
  parseRequestBody,
  requireSessionId,
  saveRecommendAccumulatedInput,
} from "../common/controllerHelpers";

const RecommendCertificationSchema = z.object({
  userInput: z.string(),
});

export async function recommendCertificationController(req: Request, res: Response) {
  const bodyData = parseRequestBody(RecommendCertificationSchema, req, res);
  if (!bodyData) return;

  try {
    const sessionId = requireSessionId(req, res);
    if (!sessionId) return;
    const mergedInput = await buildMergedRecommendInput(
      sessionId,
      RecommendSection.CERTIFICATION,
      bodyData.userInput
    );
    const result = await recommendCertificationFromInput(mergedInput);
    await saveRecommendAccumulatedInput(
      sessionId,
      RecommendSection.CERTIFICATION,
      mergedInput,
      result.isComplete
    );
    return res.json(result);
  } catch (e) {
    console.error("[recommendCertificationController]", e);
    return res.status(500).json({
      message: "Failed to recommend certification",
    });
  }
}

export async function recommendSeniorLicenseSkillController(
  req: Request,
  res: Response
) {
  const bodyData = parseRequestBody(RecommendCertificationSchema, req, res);
  if (!bodyData) return;

  try {
    const sessionId = requireSessionId(req, res);
    if (!sessionId) return;
    const mergedInput = await buildMergedRecommendInput(
      sessionId,
      RecommendSection.CERTIFICATION,
      bodyData.userInput
    );
    const result = await recommendSeniorLicenseSkillFromInput(mergedInput);
    await saveRecommendAccumulatedInput(
      sessionId,
      RecommendSection.CERTIFICATION,
      mergedInput,
      result.isComplete
    );
    return res.json(result);
  } catch (e) {
    console.error("[POST /api/recommend/senior-license-skill]", e);
    return res.status(500).json({
      message: "Failed to recommend senior license skill",
    });
  }
}
