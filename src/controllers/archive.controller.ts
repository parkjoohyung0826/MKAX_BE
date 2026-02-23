import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { deleteAccessCode, findAccessCode } from "../repositories/accessCode.repository";
import { parseRequestBody } from "../common/controllerHelpers";
import { findAccessCodeOrSend404 } from "../common/accessCodeHelpers";

const FetchSchema = z.object({
  code: z.string().min(4),
});

export async function fetchArchiveByCodeController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const bodyData = parseRequestBody(FetchSchema, req, res);
  if (!bodyData) return;

  try {
    const record = await findAccessCodeOrSend404(bodyData.code, res);
    if (!record) return;
    return res.status(200).json(record.payload);
  } catch (err) {
    console.error("🔥 Error in fetchArchiveByCodeController");
    return next(err);
  }
}

export async function deleteArchiveByCodeController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const bodyData = parseRequestBody(FetchSchema, req, res);
  if (!bodyData) return;

  try {
    const record = await findAccessCodeOrSend404(bodyData.code, res);
    if (!record) return;
    await deleteAccessCode(bodyData.code);
    return res.status(200).json({ message: "삭제 완료" });
  } catch (err) {
    console.error("🔥 Error in deleteArchiveByCodeController");
    return next(err);
  }
}
