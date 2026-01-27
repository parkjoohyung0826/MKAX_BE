import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { formatResumeData } from "../services/resumeFormat.service";

const ResumeFormatSchema = z.object({
  name: z.string(),
  englishName: z.string(),
  dateOfBirth: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  emergencyContact: z.string(),
  address: z.string(),
  photo: z.string(),
  desiredJob: z.string(),
  education: z.string(),
  workExperience: z.string(),
  coreCompetencies: z.string(),
  certifications: z.string(),
});

export async function formatResumeController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = ResumeFormatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const data = await formatResumeData(parsed.data);
    return res.json(data);
  } catch (err) {
    console.error("🔥 Error in formatResumeController");
    next(err);
  }
}
