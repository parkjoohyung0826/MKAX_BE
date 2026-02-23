import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import {
  analyzeResumeAndCoverLetter,
  CoverLetterData,
} from "../services/analysisReport.service";
import { analyzeReportFromPdfFiles } from "../services/pdfAnalysis.service";
import {
  updateAccessCode,
} from "../repositories/accessCode.repository";
import {
  parseRequestBody,
  withControllerErrorHandling,
} from "../common/controllerHelpers";
import {
  asObjectPayload,
  createNewAccessCodeWithPayload,
  findAccessCodeOrSend404,
  updateAccessCodeWithMergedPayload,
} from "../common/accessCodeHelpers";

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

export const analysisReportController = withControllerErrorHandling(
  async (req: Request, res: Response) => {
    const bodyData = parseRequestBody(AnalysisReportSchema, req, res);
    if (!bodyData) return;

    const record = await findAccessCodeOrSend404(bodyData.code, res);
    if (!record) return;

    const report = await analyzeResumeAndCoverLetter(
      bodyData.resume,
      bodyData.coverLetter
    );
    console.log("🧾 Analysis report result:", report);
    await updateAccessCodeWithMergedPayload(bodyData.code, record.payload, {
      analysisReport: report,
      analysisReportIssuedAt: new Date().toISOString(),
      analysisReportSourceType: "json",
    });
    return res.status(200).json({
      ...report,
      analysisReportSourceType: "json",
    });
  },
  "analysisReportController"
);

export const analysisReportPdfController = withControllerErrorHandling(
  async (req: Request, res: Response) => {
    const files = (
      req as Request & {
        files?: { [fieldname: string]: Express.Multer.File[] };
      }
    ).files;
    const resumeFile = files?.resume?.[0];
    const coverLetterFile = files?.coverLetter?.[0];

    if (!resumeFile && !coverLetterFile) {
      return res.status(400).json({
        message: "resume 또는 coverLetter PDF 파일이 필요합니다.",
      });
    }

    let code = typeof req.body?.code === "string" ? req.body.code : undefined;

    if (code) {
      const record = await findAccessCodeOrSend404(code, res);
      if (!record) return;
    } else {
      code = await createNewAccessCodeWithPayload({
        issuedAt: new Date().toISOString(),
      });
    }

    const { report, extractedTexts, sources, sourceUrls } = await analyzeReportFromPdfFiles(
      resumeFile,
      coverLetterFile
    );

    const record = await findAccessCodeOrSend404(code, res);
    if (!record) return;
    await updateAccessCodeWithMergedPayload(code, record.payload, {
      analysisReport: report,
      analysisReportIssuedAt: new Date().toISOString(),
      analysisReportSources: sources,
      analysisReportSourceUrls: sourceUrls,
      analysisReportExtractedTexts: extractedTexts,
      analysisReportSourceType: "pdf",
    });

    return res.status(200).json({
      code,
      report,
      analysisReportSourceType: "pdf",
      ...sourceUrls,
    });
  },
  "analysisReportPdfController"
);
