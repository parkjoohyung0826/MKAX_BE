import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { recommendProfileFromDescription } from "../services/profile.service";

const ProfileSchema = z.object({
  description: z.string(),
});

export async function recommendProfileController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = ProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const { description } = parsed.data;
    const data = await recommendProfileFromDescription(description);
    return res.json(data);
  } catch (err) {
    console.error("🔥 Error in recommendProfileController");
    next(err);
  }
}
