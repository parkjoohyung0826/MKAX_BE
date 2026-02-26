import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { updateAccessCode } from "../repositories/accessCode.repository";
import { Prisma } from "@prisma/client";
import {
  getRecruitmentFilterOptions,
  listRecruitments,
  matchRecruitments,
  syncRecruitmentPostings,
} from "../services/recruitmentMatch.service";
import {
  formatResumeFromExtractedText,
  ResumeFormatResult,
} from "../services/resumeFormat.service";
import {
  parseRequestBody,
  parseRequestQuery,
  withControllerErrorHandling,
} from "../common/controllerHelpers";
import {
  booleanLikeQuerySchema,
  csvStringArrayQuerySchema,
} from "../common/zodQuerySchemas";
import {
  asObjectPayload,
  findAccessCodeOrSend404,
  updateAccessCodeWithMergedPayload,
} from "../common/accessCodeHelpers";

const MatchSchema = z.object({
  code: z.string().min(4),
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
const ListRecruitmentsQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  regions: csvStringArrayQuerySchema,
  fields: csvStringArrayQuerySchema,
  careerTypes: csvStringArrayQuerySchema,
  educationLevels: csvStringArrayQuerySchema,
  hireTypes: csvStringArrayQuerySchema,
  includeClosed: booleanLikeQuerySchema,
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
const RecruitmentFiltersQuerySchema = z.object({
  includeClosed: booleanLikeQuerySchema,
});

export const matchRecruitmentsController = withControllerErrorHandling(
  async (req: Request, res: Response) => {
    const bodyData = parseRequestBody(MatchSchema, req, res);
    if (!bodyData) return;

    const record = await findAccessCodeOrSend404(bodyData.code, res);
    if (!record) {
      return;
    }

    let currentPayload = asObjectPayload(record.payload);
    let resume = currentPayload.resume as ResumeFormatResult | undefined;
    const coverLetter = currentPayload.coverLetter as Record<string, string> | undefined;

    if (!resume) {
      const extractedTexts = currentPayload.analysisReportExtractedTexts as
        | { resumeText?: string; coverLetterText?: string }
        | undefined;
      const extractedResumeText =
        typeof extractedTexts?.resumeText === "string"
          ? extractedTexts.resumeText
          : "";

      if (extractedResumeText.trim()) {
        resume = await formatResumeFromExtractedText(extractedResumeText);
        currentPayload = asObjectPayload(
          await updateAccessCodeWithMergedPayload(bodyData.code, currentPayload, {
            resume,
            resumeDerivedFromPdf: true,
            resumeDerivedAt: new Date().toISOString(),
          })
        );
      }
    }

    if (!resume) {
      return res.status(400).json({ message: "이력서 데이터가 없습니다. (PDF 분석 결과에는 추출 텍스트 저장이 필요합니다.)" });
    }

    const offset = bodyData.offset ?? 0;
    const limit = bodyData.limit ?? 10;
    const result = await matchRecruitments(resume, coverLetter, offset, limit);
    console.log("[matchRecruitmentsController] matched recruitments", {
      code: bodyData.code,
      offset,
      limit,
      total: result.total,
      itemCount: result.items.length,
      data: result,
    });

    if (offset === 0) {
      await updateAccessCodeWithMergedPayload(bodyData.code, currentPayload, {
        recruitmentMatch: result,
        recruitmentMatchIssuedAt: new Date().toISOString(),
      });
    }

    return res.status(200).json(result);
  },
  "matchRecruitmentsController"
);

export const listRecruitmentsController = withControllerErrorHandling(
  async (req: Request, res: Response) => {
    const queryData = parseRequestQuery(ListRecruitmentsQuerySchema, req, res);
    if (!queryData) return;

    const offset = queryData.offset ?? 0;
    const limit = queryData.limit ?? 10;
    const result = await listRecruitments(
      {
        q: queryData.q,
        regions: queryData.regions,
        fields: queryData.fields,
        careerTypes: queryData.careerTypes,
        educationLevels: queryData.educationLevels,
        hireTypes: queryData.hireTypes,
        includeClosed: queryData.includeClosed,
      },
      offset,
      limit
    );
    return res.status(200).json(result);
  },
  "listRecruitmentsController"
);

export const syncRecruitmentsController = withControllerErrorHandling(
  async (_req: Request, res: Response) => {
    const result = await syncRecruitmentPostings(true);
    return res.status(200).json({
      message: "Recruitment postings synchronized.",
      result,
    });
  },
  "syncRecruitmentsController"
);

export const recruitmentFilterOptionsController = withControllerErrorHandling(
  async (req: Request, res: Response) => {
    const queryData = parseRequestQuery(RecruitmentFiltersQuerySchema, req, res);
    if (!queryData) return;

    const result = await getRecruitmentFilterOptions(queryData.includeClosed);
    return res.status(200).json(result);
  },
  "recruitmentFilterOptionsController"
);
