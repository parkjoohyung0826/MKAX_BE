import { Request, Response } from "express";
import { z } from "zod";
import { recommendCertificationFromInput } from "../services/certification.service";

const RecommendCertificationSchema = z.object({
  userInput: z.string().min(3, "userInput은 최소 3자 이상 입력해주세요."),
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
    const { userInput } = parsed.data;
    const data = await recommendCertificationFromInput(userInput);
    return res.json(data);
  } catch (e) {
    console.error("[recommendCertificationController]", e);
    return res.status(500).json({
      message: "Failed to recommend certification",
    });
  }
}
