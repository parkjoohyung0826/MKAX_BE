import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { findAccessCode } from "../repositories/accessCode.repository";

const FetchSchema = z.object({
  code: z.string().min(4),
});

export async function fetchArchiveByCodeController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = FetchSchema.safeParse(req.body ?? {});
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
    return res.status(200).json(record.payload);
  } catch (err) {
    console.error("🔥 Error in fetchArchiveByCodeController");
    return next(err);
  }
}
