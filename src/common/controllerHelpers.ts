import { RecommendSection } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import {
  getRecommendState,
  saveRecommendState,
} from "../repositories/recommendChat.repository";

type AnyZodSchema = z.ZodTypeAny;
type AsyncController = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

function parseWithSchema<TSchema extends AnyZodSchema>(
  schema: TSchema,
  input: unknown,
  res: Response,
  invalidMessage: string
): z.infer<TSchema> | null {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    res.status(400).json({
      message: invalidMessage,
      errors: parsed.error.flatten(),
    });
    return null;
  }

  return parsed.data;
}

export function parseRequestBody<TSchema extends AnyZodSchema>(
  schema: TSchema,
  req: Request,
  res: Response
): z.infer<TSchema> | null {
  return parseWithSchema(schema, req.body ?? {}, res, "Invalid request body");
}

export function parseRequestQuery<TSchema extends AnyZodSchema>(
  schema: TSchema,
  req: Request,
  res: Response
): z.infer<TSchema> | null {
  return parseWithSchema(schema, req.query ?? {}, res, "Invalid query");
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

type RecommendControllerErrorConfig = {
  logLabel: string;
  message: string;
  status?: number;
};

type RecommendControllerOptions<TSchema extends AnyZodSchema, TResult> = {
  schema: TSchema;
  section: RecommendSection;
  getInput: (data: z.infer<TSchema>) => string;
  service: (mergedInput: string) => Promise<TResult>;
  getIsComplete?: (result: TResult) => boolean;
  errorTag?: string;
  fallbackError?: RecommendControllerErrorConfig;
};

export function createRecommendAccumulatedController<
  TSchema extends AnyZodSchema,
  TResult,
>({ schema, section, getInput, service, getIsComplete, errorTag, fallbackError }: RecommendControllerOptions<TSchema, TResult>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const bodyData = parseRequestBody(schema, req, res);
    if (!bodyData) {
      return;
    }

    try {
      const sessionId = requireSessionId(req, res);
      if (!sessionId) {
        return;
      }

      const mergedInput = await buildMergedRecommendInput(
        sessionId,
        section,
        getInput(bodyData)
      );
      const result = await service(mergedInput);
      await saveRecommendAccumulatedInput(
        sessionId,
        section,
        mergedInput,
        getIsComplete ? getIsComplete(result) : false
      );

      return res.json(result);
    } catch (err) {
      if (fallbackError) {
        console.error(fallbackError.logLabel, err);
        return res.status(fallbackError.status ?? 500).json({
          message: fallbackError.message,
        });
      }

      console.error(`🔥 Error in ${errorTag ?? "recommend controller"}`);
      return next(err);
    }
  };
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

export function withControllerErrorHandling(
  handler: AsyncController,
  errorTag: string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      return await handler(req, res, next);
    } catch (err) {
      console.error(`🔥 Error in ${errorTag}`);
      return next(err);
    }
  };
}

export function createSessionResetController<TSchema extends AnyZodSchema>(
  schema: TSchema,
  resetFn: (sessionId: string, section?: z.infer<TSchema>[keyof z.infer<TSchema>]) => Promise<unknown>,
  getSection: (data: z.infer<TSchema>) => z.infer<TSchema>[keyof z.infer<TSchema>],
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
      await resetFn(sessionId, getSection(data));
      return res.status(200).json({ message: "chat reset" });
    } catch (err) {
      console.error(`🔥 Error in ${errorTag}`);
      return next(err);
    }
  };
}
