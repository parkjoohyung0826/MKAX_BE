import { Request, Response } from "express";
import { z } from "zod";
import { recommendCareerFromInput } from "../services/career.service";

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
    const result = await recommendCareerFromInput(parsed.data.userInput);
    return res.json(result);
  } catch (e: any) {
    console.error("[Career AI Error]", e);
    return res.status(500).json({
      message: "Failed to generate career description",
    });
  }
}
