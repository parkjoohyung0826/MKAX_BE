import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { formatResumeData } from "../services/resumeFormat.service";
import { randomInt } from "crypto";
import { createAccessCode, findAccessCode } from "../repositories/accessCode.repository";
import { getCoverLetterState } from "../repositories/archive.repository";

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
    if (!req.sessionId) {
      return res.status(400).json({ message: "sessionId가 필요합니다." });
    }
    const data = await formatResumeData(parsed.data);
    const coverLetter = await getCoverLetterState(req.sessionId);
    const payload = {
      sessionId: req.sessionId,
      resume: data,
      coverLetter,
      issuedAt: new Date().toISOString(),
    };

    let code = String(randomInt(0, 1000000)).padStart(6, "0");
    for (let i = 0; i < 5; i += 1) {
      const exists = await findAccessCode(code);
      if (!exists) break;
      code = String(randomInt(0, 1000000)).padStart(6, "0");
    }

    await createAccessCode(code, payload);

    return res.json({
      resume: data,
      coverLetter,
      code,
    });
  } catch (err) {
    console.error("🔥 Error in formatResumeController");
    next(err);
  }
}
