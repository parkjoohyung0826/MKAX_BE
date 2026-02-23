import { Prisma } from "@prisma/client";
import { Response } from "express";
import { randomInt } from "crypto";
import {
  createAccessCode,
  findAccessCode,
  updateAccessCode,
} from "../repositories/accessCode.repository";

export function asObjectPayload(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }

  return {};
}

export async function findAccessCodeOrSend404(code: string, res: Response) {
  const record = await findAccessCode(code);
  if (!record) {
    res.status(404).json({ message: "인증번호가 유효하지 않습니다." });
    return null;
  }

  return record;
}

export async function generateUniqueAccessCode(maxAttempts = 6): Promise<string> {
  let code = String(randomInt(0, 1000000)).padStart(6, "0");

  for (let i = 0; i < maxAttempts; i += 1) {
    const exists = await findAccessCode(code);
    if (!exists) {
      return code;
    }
    code = String(randomInt(0, 1000000)).padStart(6, "0");
  }

  throw new Error("Failed to generate unique access code.");
}

export async function createNewAccessCodeWithPayload(payload: Prisma.InputJsonValue) {
  const code = await generateUniqueAccessCode();
  await createAccessCode(code, payload);
  return code;
}

export function mergeAccessCodePayload(
  currentPayload: unknown,
  patch: Record<string, unknown>
): Prisma.InputJsonValue {
  return {
    ...asObjectPayload(currentPayload),
    ...patch,
  } as Prisma.InputJsonValue;
}

export async function updateAccessCodeWithMergedPayload(
  code: string,
  currentPayload: unknown,
  patch: Record<string, unknown>
) {
  const mergedPayload = mergeAccessCodePayload(currentPayload, patch);
  await updateAccessCode(code, mergedPayload);
  return mergedPayload;
}
