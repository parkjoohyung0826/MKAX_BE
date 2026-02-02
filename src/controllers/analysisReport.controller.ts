import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import {
  analyzeResumeAndCoverLetter,
  CoverLetterData,
} from "../services/analysisReport.service";
import {
  findAccessCode,
  updateAccessCode,
} from "../repositories/accessCode.repository";

const ResumeSchema = z.object({
  name: z.string(),
  englishName: z.string(),
  dateOfBirth: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  emergencyContact: z.string(),
  address: z.string(),
  photo: z.string(),
  desiredJob: z.string(),
  education: z.array(
    z.object({
      schoolName: z.string(),
      major: z.string(),
      period: z.string(),
      graduationStatus: z.string(),
      details: z.string(),
    })
  ),
  workExperience: z.array(
    z.object({
      companyName: z.string(),
      period: z.string(),
      mainTask: z.string(),
      leavingReason: z.string(),
    })
  ),
  coreCompetencies: z.array(
    z.object({
      fullDescription: z.string(),
      period: z.string(),
      courseName: z.string(),
      institution: z.string(),
    })
  ),
  certifications: z.array(
    z.object({
      certificationName: z.string(),
      period: z.string(),
      institution: z.string(),
    })
  ),
});

const CoverLetterSchema: z.ZodType<CoverLetterData> = z.object({
  growthProcess: z.string(),
  strengthsAndWeaknesses: z.string(),
  keyExperience: z.string(),
  motivation: z.string(),
});

const AnalysisReportSchema = z.object({
  code: z.string().min(4),
  resume: ResumeSchema,
  coverLetter: CoverLetterSchema,
});

export async function analysisReportController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = AnalysisReportSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const record = await findAccessCode(parsed.data.code);
    if (!record) {
      return res.status(404).json({ message: "인증번호가 유효하지 않습니다." });
    }
    const report = await analyzeResumeAndCoverLetter(
      parsed.data.resume,
      parsed.data.coverLetter
    );
    console.log("🧾 Analysis report result:", report);
    const basePayload =
      record.payload &&
      typeof record.payload === "object" &&
      !Array.isArray(record.payload)
        ? record.payload
        : {};
    const payload: Prisma.InputJsonValue = {
      ...(basePayload as Record<string, unknown>),
      analysisReport: report,
      analysisReportIssuedAt: new Date().toISOString(),
    };
    await updateAccessCode(parsed.data.code, payload);
    return res.status(200).json(report);
  } catch (err) {
    console.error("🔥 Error in analysisReportController");
    return next(err);
  }
}
