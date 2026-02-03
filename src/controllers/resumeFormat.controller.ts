import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { formatResumeData } from "../services/resumeFormat.service";
import { randomInt } from "crypto";
import { createAccessCode, findAccessCode } from "../repositories/accessCode.repository";
import { getCoverLetterState } from "../repositories/archive.repository";

const ResumeFormatSchema = z.object({
  name: z.string().max(100),
  englishName: z.string().max(100),
  dateOfBirth: z.string().max(50),
  email: z.string().max(200),
  phoneNumber: z.string().max(50),
  emergencyContact: z.string().max(50),
  address: z.string().max(500),
  photo: z.string().max(1000),
  desiredJob: z.string().max(200),
  education: z.string().max(20000),
  workExperience: z.string().max(20000),
  coreCompetencies: z.string().max(20000),
  certifications: z.string().max(20000),
  coverLetter: z
    .object({
      growthProcess: z.string().max(20000),
      strengthsAndWeaknesses: z.string().max(20000),
      keyExperience: z.string().max(20000),
      motivation: z.string().max(20000),
    })
    .optional(),
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
    const coverLetter =
      parsed.data.coverLetter ??
      (await getCoverLetterState(req.sessionId));
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
