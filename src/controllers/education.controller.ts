import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { recommendEducationFromDescription } from "../services/education.service";

const EducationSchema = z.object({
  description: z.string(),
});

export async function recommendEducationController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log("body:", req.body);

  const parsed = EducationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const { description } = parsed.data;
    const data = await recommendEducationFromDescription(description);
    return res.json(data);
  } catch (err) {
    console.error("🔥 Error in recommendEducationController");
    next(err);
  }
}
