import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { findAccessCode, updateAccessCode } from "../repositories/accessCode.repository";
import { Prisma } from "@prisma/client";
import {
  listRecruitments,
  matchRecruitments,
} from "../services/recruitmentMatch.service";
import { ResumeFormatResult } from "../services/resumeFormat.service";

const MatchSchema = z.object({
  code: z.string().min(4),
});
const ListRecruitmentsQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
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

    const result = await matchRecruitments(resume, coverLetter, 0, 10);

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
    const result = await listRecruitments(offset, limit);
    return res.status(200).json(result);
  } catch (err) {
    console.error("🔥 Error in listRecruitmentsController");
    return next(err);
  }
}
