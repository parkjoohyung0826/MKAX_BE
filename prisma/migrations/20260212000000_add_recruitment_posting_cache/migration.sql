CREATE TABLE "RecruitmentPosting" (
    "id" SERIAL NOT NULL,
    "recrutPblntSn" INTEGER NOT NULL,
    "instNm" TEXT NOT NULL DEFAULT '',
    "recrutPbancTtl" TEXT NOT NULL DEFAULT '',
    "recrutSeNm" TEXT NOT NULL DEFAULT '',
    "aplyQlfcCn" TEXT NOT NULL DEFAULT '',
    "prefCn" TEXT NOT NULL DEFAULT '',
    "pbancBgngYmd" TEXT,
    "pbancEndYmd" TEXT,
    "ongoingYn" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isOngoing" BOOLEAN NOT NULL DEFAULT true,
    "ncsCdNmLst" TEXT NOT NULL DEFAULT '',
    "hireTypeNmLst" TEXT NOT NULL DEFAULT '',
    "workRgnNmLst" TEXT NOT NULL DEFAULT '',
    "acbgCondNmLst" TEXT NOT NULL DEFAULT '',
    "ncsCdNmList" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hireTypeNmList" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workRgnNmList" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "acbgCondNmList" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "searchText" TEXT NOT NULL DEFAULT '',
    "raw" JSONB NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruitmentPosting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecruitmentPosting_recrutPblntSn_key" ON "RecruitmentPosting"("recrutPblntSn");
CREATE INDEX "RecruitmentPosting_isActive_isOngoing_idx" ON "RecruitmentPosting"("isActive", "isOngoing");
CREATE INDEX "RecruitmentPosting_pbancEndYmd_idx" ON "RecruitmentPosting"("pbancEndYmd");
CREATE INDEX "RecruitmentPosting_recrutSeNm_idx" ON "RecruitmentPosting"("recrutSeNm");
CREATE INDEX "RecruitmentPosting_lastSeenAt_idx" ON "RecruitmentPosting"("lastSeenAt");
CREATE INDEX "RecruitmentPosting_workRgnNmList_idx" ON "RecruitmentPosting" USING GIN ("workRgnNmList");
CREATE INDEX "RecruitmentPosting_ncsCdNmList_idx" ON "RecruitmentPosting" USING GIN ("ncsCdNmList");
CREATE INDEX "RecruitmentPosting_hireTypeNmList_idx" ON "RecruitmentPosting" USING GIN ("hireTypeNmList");
CREATE INDEX "RecruitmentPosting_acbgCondNmList_idx" ON "RecruitmentPosting" USING GIN ("acbgCondNmList");
