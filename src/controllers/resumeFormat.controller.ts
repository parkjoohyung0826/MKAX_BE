import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { formatResumeData } from "../services/resumeFormat.service";
import { getCoverLetterState } from "../repositories/archive.repository";
import { parseRequestBody, requireSessionId } from "../common/controllerHelpers";
import { createNewAccessCodeWithPayload } from "../common/accessCodeHelpers";

const ResumeFormatSchema = z.object({
  resumeType: z.enum(["basic", "senior"]).optional().default("basic"),
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
  const bodyData = parseRequestBody(ResumeFormatSchema, req, res);
  if (!bodyData) return;

  try {
    const sessionId = requireSessionId(req, res);
    if (!sessionId) return;
    const data = await formatResumeData(bodyData);
    const coverLetter =
      bodyData.coverLetter ??
      (await getCoverLetterState(sessionId));
    const payload = {
      sessionId,
      resumeType: bodyData.resumeType,
      resume: data,
      coverLetter,
      issuedAt: new Date().toISOString(),
    };

    const code = await createNewAccessCodeWithPayload(payload);

    return res.json({
      resumeType: bodyData.resumeType,
      resume: data,
      coverLetter,
      code,
    });
  } catch (err) {
    console.error("🔥 Error in formatResumeController");
    next(err);
  }
}
