import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const status =
    typeof err?.status === "number"
      ? err.status
      : typeof err?.statusCode === "number"
      ? err.statusCode
      : 500;
  const message =
    typeof err?.message === "string" && err.message.trim()
      ? err.message
      : "Internal Server Error";

  const stack =
    err instanceof Error ? err.stack : typeof err === "string" ? err : undefined;
  console.error(
    JSON.stringify({
      tag: "global_error_handler",
      method: req.method,
      url: req.originalUrl,
      status,
      message,
      stack,
    })
  );

  if (res.headersSent) {
    return next(err);
  }

  res.status(status).json({
    message,
  });
}
