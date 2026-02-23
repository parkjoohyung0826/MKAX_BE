import { RecommendSection } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import {
  getRecommendState,
  saveRecommendState,
} from "../repositories/recommendChat.repository";

type AnyZodSchema = z.ZodTypeAny;

export function parseRequestBody<TSchema extends AnyZodSchema>(
  schema: TSchema,
  req: Request,
  res: Response
): z.infer<TSchema> | null {
  const parsed = schema.safeParse(req.body ?? {});

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.flatten(),
    });
    return null;
  }

  return parsed.data;
}

export function requireSessionId(req: Request, res: Response): string | null {
  if (!req.sessionId) {
    res.status(400).json({ message: "sessionId가 필요합니다." });
    return null;
  }

  return req.sessionId;
}

export function mergeNonEmptyText(
  ...values: Array<string | null | undefined>
): string {
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join("\n");
}

export async function buildMergedRecommendInput(
  sessionId: string,
  section: RecommendSection,
  latestInput: string
) {
  const stored = await getRecommendState(sessionId, section);

  return mergeNonEmptyText(stored?.accumulatedInput, latestInput);
}

export async function saveRecommendAccumulatedInput(
  sessionId: string,
  section: RecommendSection,
  mergedInput: string,
  isComplete: boolean
) {
  await saveRecommendState(sessionId, section, isComplete ? "" : mergedInput);
}

export function createSessionChatController<TSchema extends AnyZodSchema, TResult>(
  schema: TSchema,
  service: (
    payload: z.infer<TSchema> & { sessionId: string }
  ) => Promise<TResult>,
  errorTag: string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const data = parseRequestBody(schema, req, res);
    if (!data) {
      return;
    }

    const sessionId = requireSessionId(req, res);
    if (!sessionId) {
      return;
    }

    try {
      const result = await service({
        ...data,
        sessionId,
      });
      return res.json(result);
    } catch (err) {
      console.error(`🔥 Error in ${errorTag}`);
      return next(err);
    }
  };
}
