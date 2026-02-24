import { NextFunction, Request, Response } from "express";
import {
  buildRequestCostSummary,
  runWithRequestMetrics,
} from "../common/requestMetrics";

export function requestMetrics(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestStartAt = Date.now();
  const store = {
    requestStartAt,
    method: req.method,
    path: req.originalUrl || req.url,
    sessionId: req.sessionId,
    geminiCalls: [] as Array<{
      model?: string;
      durationMs: number;
      usage: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    }>,
  };

  runWithRequestMetrics(
    store,
    () => {
      res.on("finish", () => {
        store.sessionId = req.sessionId;
        const durationMs = Date.now() - requestStartAt;
        const summary = buildRequestCostSummary({
          store,
          statusCode: res.statusCode,
          durationMs,
        });

        console.log(JSON.stringify(summary));
      });

      next();
    }
  );
}
