import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { findAccessCode, updateAccessCode } from "../repositories/accessCode.repository";
import { Prisma } from "@prisma/client";
import {
  getRecruitmentFilterOptions,
  listRecruitments,
  matchRecruitments,
  syncRecruitmentPostings,
} from "../services/recruitmentMatch.service";
import { ResumeFormatResult } from "../services/resumeFormat.service";

const MatchSchema = z.object({
  code: z.string().min(4),
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
const ListRecruitmentsQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  regions: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      const values = Array.isArray(value) ? value : value ? [value] : [];
      return values.flatMap((item) =>
        String(item)
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      );
    }),
  fields: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      const values = Array.isArray(value) ? value : value ? [value] : [];
      return values.flatMap((item) =>
        String(item)
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      );
    }),
  careerTypes: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      const values = Array.isArray(value) ? value : value ? [value] : [];
      return values.flatMap((item) =>
        String(item)
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      );
    }),
  educationLevels: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      const values = Array.isArray(value) ? value : value ? [value] : [];
      return values.flatMap((item) =>
        String(item)
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      );
    }),
  hireTypes: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      const values = Array.isArray(value) ? value : value ? [value] : [];
      return values.flatMap((item) =>
        String(item)
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      );
    }),
  includeClosed: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
const RecruitmentFiltersQuerySchema = z.object({
  includeClosed: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
});

export async function matchRecruitmentsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = MatchSchema.safeParse(req.body ?? {});
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

    const storedPayload = record.payload as Record<string, unknown>;
    const resume = storedPayload.resume as ResumeFormatResult | undefined;
    const coverLetter = storedPayload.coverLetter as Record<string, string> | undefined;

    if (!resume) {
      return res.status(400).json({ message: "이력서 데이터가 없습니다." });
    }

    const offset = parsed.data.offset ?? 0;
    const limit = parsed.data.limit ?? 10;
    const result = await matchRecruitments(resume, coverLetter, offset, limit);

    if (offset === 0) {
      const basePayload =
        record.payload &&
        typeof record.payload === "object" &&
        !Array.isArray(record.payload)
          ? record.payload
          : {};
      const updatedPayload: Prisma.InputJsonValue = {
        ...(basePayload as Record<string, unknown>),
        recruitmentMatch: result,
        recruitmentMatchIssuedAt: new Date().toISOString(),
      };
      await updateAccessCode(parsed.data.code, updatedPayload);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("🔥 Error in matchRecruitmentsController");
    return next(err);
  }
}

export async function listRecruitmentsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = ListRecruitmentsQuerySchema.safeParse(req.query ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid query",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const offset = parsed.data.offset ?? 0;
    const limit = parsed.data.limit ?? 10;
    const result = await listRecruitments(
      {
        q: parsed.data.q,
        regions: parsed.data.regions,
        fields: parsed.data.fields,
        careerTypes: parsed.data.careerTypes,
        educationLevels: parsed.data.educationLevels,
        hireTypes: parsed.data.hireTypes,
        includeClosed: parsed.data.includeClosed,
      },
      offset,
      limit
    );
    return res.status(200).json(result);
  } catch (err) {
    console.error("🔥 Error in listRecruitmentsController");
    return next(err);
  }
}

export async function syncRecruitmentsController(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await syncRecruitmentPostings(true);
    return res.status(200).json({
      message: "Recruitment postings synchronized.",
      result,
    });
  } catch (err) {
    console.error("🔥 Error in syncRecruitmentsController");
    return next(err);
  }
}

export async function recruitmentFilterOptionsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = RecruitmentFiltersQuerySchema.safeParse(req.query ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid query",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const result = await getRecruitmentFilterOptions(parsed.data.includeClosed);
    return res.status(200).json(result);
  } catch (err) {
    console.error("🔥 Error in recruitmentFilterOptionsController");
    return next(err);
  }
}
