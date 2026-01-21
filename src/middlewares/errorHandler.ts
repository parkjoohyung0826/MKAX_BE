import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("🔥 [Global Error Handler]");
  console.error("URL:", req.method, req.originalUrl);
  console.error("Error:", err);

  res.status(500).json({
    message: err?.message ?? "Internal Server Error",
  });
}
