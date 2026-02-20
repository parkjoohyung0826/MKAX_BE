import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";
import { Storage } from "@google-cloud/storage";
import { z } from "zod";

const storage = new Storage();

const PhotoUploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(255),
});

function resolveBucketName(): string {
  const bucketName = process.env.GCS_BUCKET;
  if (!bucketName) {
    const err = new Error("Missing GCS_BUCKET environment variable.");
    (err as Error & { status?: number }).status = 500;
    throw err;
  }
  return bucketName;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function createPhotoUploadUrlController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = PhotoUploadRequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const { fileName, contentType } = parsed.data;
    const bucketName = resolveBucketName();
    const safeName = sanitizeFileName(fileName || "photo");
    const objectPath = `profiles/${randomUUID()}-${safeName}`;
    const file = storage.bucket(bucketName).file(objectPath);

    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 10 * 60 * 1000,
      contentType,
    });

    const viewUrl = `https://storage.googleapis.com/${bucketName}/${objectPath}`;
    return res.status(200).json({ uploadUrl, viewUrl, objectPath });
  } catch (err) {
    return next(err);
  }
}
