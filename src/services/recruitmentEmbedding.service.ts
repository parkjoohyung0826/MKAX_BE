import { createHash } from "crypto";
import { genAI } from "../common/gemini";
import { normalize } from "../common/textProcessing";
import { prisma } from "../infra/db/prisma";
import type { RecruitmentRagSource } from "./recruitmentRag.service";

const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";
const EMBEDDING_DIMENSION = 768;

export function buildRecruitmentEmbeddingText(source: RecruitmentRagSource) {
  return [
    normalize(source.instNm) ? `기관: ${normalize(source.instNm)}` : "",
    normalize(source.recrutPbancTtl)
      ? `공고명: ${normalize(source.recrutPbancTtl)}`
      : "",
    normalize(source.recrutSeNm) ? `채용구분: ${normalize(source.recrutSeNm)}` : "",
    normalize(source.ncsCdNmLst) ? `직무분야: ${normalize(source.ncsCdNmLst)}` : "",
    normalize(source.hireTypeNmLst)
      ? `고용형태: ${normalize(source.hireTypeNmLst)}`
      : "",
    normalize(source.workRgnNmLst)
      ? `근무지역: ${normalize(source.workRgnNmLst)}`
      : "",
    normalize(source.acbgCondNmLst)
      ? `학력조건: ${normalize(source.acbgCondNmLst)}`
      : "",
    normalize(source.aplyQlfcCn)
      ? `자격요건: ${normalize(source.aplyQlfcCn)}`
      : "",
    normalize(source.prefCn) ? `우대사항: ${normalize(source.prefCn)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function hashRecruitmentEmbeddingText(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function toPgVector(values: number[]) {
  return `[${values.join(",")}]`;
}

async function embedText(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL }) as {
    embedContent: (input: string) => Promise<{
      embedding?: { values?: number[] };
    }>;
  };
  const result = await model.embedContent(text);
  const values = result.embedding?.values ?? [];

  if (values.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Unexpected embedding dimension: ${values.length} (expected ${EMBEDDING_DIMENSION})`
    );
  }

  return values;
}

function shouldSyncRecruitmentEmbeddings() {
  return (
    process.env.RECRUITMENT_EMBEDDING_SYNC_ENABLED === "true" ||
    process.env.RECRUITMENT_RETRIEVAL_MODE === "vector"
  );
}

export async function embedRecruitmentQuery(text: string): Promise<number[]> {
  return embedText(text);
}

export async function syncRecruitmentPostingEmbeddings(
  sources: RecruitmentRagSource[]
) {
  if (!shouldSyncRecruitmentEmbeddings() || sources.length === 0) {
    return { attempted: 0, skipped: sources.length, upserted: 0, failed: 0 };
  }

  let attempted = 0;
  let skipped = 0;
  let upserted = 0;
  let failed = 0;

  const concurrency = Math.max(
    1,
    Math.min(Number(process.env.RECRUITMENT_EMBEDDING_CONCURRENCY ?? "2"), 5)
  );

  for (let i = 0; i < sources.length; i += concurrency) {
    const chunk = sources.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (source) => {
        try {
          const text = buildRecruitmentEmbeddingText(source);
          const sourceHash = hashRecruitmentEmbeddingText(text);

          if (!text) return "skipped" as const;

          const existing = await prisma.$queryRaw<Array<{ sourceHash: string }>>`
            SELECT "sourceHash"
            FROM "RecruitmentPostingEmbedding"
            WHERE "recrutPblntSn" = ${source.recrutPblntSn}
            LIMIT 1
          `;

          if (existing[0]?.sourceHash === sourceHash) {
            return "skipped" as const;
          }

          attempted += 1;
          const embedding = await embedText(text);
          const vector = toPgVector(embedding);

          await prisma.$executeRaw`
            INSERT INTO "RecruitmentPostingEmbedding"
              ("recrutPblntSn", "sourceHash", "embedding", "updatedAt")
            VALUES
              (${source.recrutPblntSn}, ${sourceHash}, ${vector}::vector, CURRENT_TIMESTAMP)
            ON CONFLICT ("recrutPblntSn") DO UPDATE SET
              "sourceHash" = EXCLUDED."sourceHash",
              "embedding" = EXCLUDED."embedding",
              "updatedAt" = CURRENT_TIMESTAMP
          `;

          return "upserted" as const;
        } catch (error) {
          console.warn("[recruitmentEmbedding] embedding sync skipped", {
            recrutPblntSn: source.recrutPblntSn,
            reason: error instanceof Error ? error.message : String(error),
          });
          return "failed" as const;
        }
      })
    );

    for (const result of results) {
      if (result === "skipped") skipped += 1;
      if (result === "upserted") upserted += 1;
      if (result === "failed") failed += 1;
    }
  }

  return { attempted, skipped, upserted, failed };
}
