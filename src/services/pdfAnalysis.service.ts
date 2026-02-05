import { randomUUID } from "crypto";
import { Storage } from "@google-cloud/storage";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { analyzeResumeAndCoverLetterFromText } from "./analysisReport.service";

const GCP_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const GCP_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "us";
const GCP_PROCESSOR_ID = process.env.GOOGLE_CLOUD_PROCESSOR_ID;
const GCS_BUCKET = process.env.GCS_BUCKET;

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing ${name} in environment variables.`);
  }
  return value;
}

const storage = new Storage();
const documentAi = new DocumentProcessorServiceClient({
  apiEndpoint:
    GCP_LOCATION === "eu"
      ? "eu-documentai.googleapis.com"
      : "us-documentai.googleapis.com",
});

function buildGcsKey(prefix: string, filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${prefix}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;
}

async function uploadPdfToGcs(
  buffer: Buffer,
  filename: string,
  contentType: string
) {
  const bucketName = requireEnv(GCS_BUCKET, "GCS_BUCKET");
  const key = buildGcsKey("analysis-report", filename);
  const file = storage.bucket(bucketName).file(key);
  await file.save(buffer, { contentType });
  return { bucket: bucketName, key };
}

async function extractTextFromPdf(buffer: Buffer, mimeType: string) {
  const projectId = requireEnv(GCP_PROJECT, "GOOGLE_CLOUD_PROJECT");
  const location = requireEnv(GCP_LOCATION, "GOOGLE_CLOUD_LOCATION");
  const processorId = requireEnv(
    GCP_PROCESSOR_ID,
    "GOOGLE_CLOUD_PROCESSOR_ID"
  );
  const name = documentAi.processorPath(projectId, location, processorId);

  const request = {
    name,
    rawDocument: {
      content: buffer,
      mimeType,
    },
  };

  const [result] = await documentAi.processDocument(request);
  const document = result.document;
  return document?.text ?? "";
}

export async function analyzeReportFromPdfFiles(
  resumeFile?: Express.Multer.File,
  coverLetterFile?: Express.Multer.File
) {
  requireEnv(GCP_PROJECT, "GOOGLE_CLOUD_PROJECT");

  let resumeGcs: { bucket: string; key: string } | null = null;
  let coverLetterGcs: { bucket: string; key: string } | null = null;

  if (resumeFile) {
    resumeGcs = await uploadPdfToGcs(
      resumeFile.buffer,
      resumeFile.originalname,
      resumeFile.mimetype
    );
  }

  if (coverLetterFile) {
    coverLetterGcs = await uploadPdfToGcs(
      coverLetterFile.buffer,
      coverLetterFile.originalname,
      coverLetterFile.mimetype
    );
  }

  const [resumeText, coverLetterText] = await Promise.all([
    resumeFile ? extractTextFromPdf(resumeFile.buffer, resumeFile.mimetype) : "",
    coverLetterFile
      ? extractTextFromPdf(coverLetterFile.buffer, coverLetterFile.mimetype)
      : "",
  ]);

  const report = await analyzeResumeAndCoverLetterFromText(
    resumeText,
    coverLetterText
  );

  return {
    report,
    sources: {
      resume: resumeGcs ?? undefined,
      coverLetter: coverLetterGcs ?? undefined,
    },
  };
}
