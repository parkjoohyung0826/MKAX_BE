CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "RecruitmentPostingEmbedding" (
    "recrutPblntSn" INTEGER NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruitmentPostingEmbedding_pkey" PRIMARY KEY ("recrutPblntSn"),
    CONSTRAINT "RecruitmentPostingEmbedding_recrutPblntSn_fkey"
      FOREIGN KEY ("recrutPblntSn")
      REFERENCES "RecruitmentPosting"("recrutPblntSn")
      ON DELETE CASCADE
      ON UPDATE CASCADE
);

CREATE INDEX "RecruitmentPostingEmbedding_embedding_idx"
  ON "RecruitmentPostingEmbedding"
  USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100);
