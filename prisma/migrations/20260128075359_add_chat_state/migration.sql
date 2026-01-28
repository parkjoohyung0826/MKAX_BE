-- CreateEnum
CREATE TYPE "RecommendSection" AS ENUM ('PROFILE', 'JOB', 'EDUCATION', 'CAREER', 'ACTIVITY', 'CERTIFICATION');

-- CreateTable
CREATE TABLE "RecommendState" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "section" "RecommendSection" NOT NULL,
    "accumulatedInput" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecommendState_sessionId_section_key" ON "RecommendState"("sessionId", "section");

-- AddForeignKey
ALTER TABLE "RecommendState" ADD CONSTRAINT "RecommendState_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
