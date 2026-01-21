import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { recommendJobFromDescription } from "../services/job.service";

const RecommendSchema = z.object({
  description: z.string().min(5, "description은 최소 5자 이상 입력해주세요."),
});

export async function recommendJobController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log("Request body:", req.body);

  const parsed = RecommendSchema.safeParse(req.body);
  if (!parsed.success) {
    console.warn("Validation failed");
    return res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const { description } = parsed.data;
    console.log("Description:", description);

    const data = await recommendJobFromDescription(description);

    console.log("Recommendation result:", data);
    return res.json(data);
  } catch (err) {
    console.error("Error in recommendJobController");
    next(err); 
  }
}
