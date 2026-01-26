import { Request, Response } from "express";
import { z } from "zod";
import { recommendActivityFromUserInput } from "../services/activity.service";

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
    const { userInput } = parsed.data;
    const data = await recommendActivityFromUserInput(userInput);

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
