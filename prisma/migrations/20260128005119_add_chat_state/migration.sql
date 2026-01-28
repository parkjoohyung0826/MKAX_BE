-- CreateEnum
CREATE TYPE "CoverLetterSection" AS ENUM ('GROWTH_PROCESS', 'PERSONALITY', 'CAREER_STRENGTH', 'MOTIVATION_ASPIRATION');

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatState" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "section" "CoverLetterSection" NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "finalDraft" TEXT NOT NULL DEFAULT '',
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatState_sessionId_section_key" ON "ChatState"("sessionId", "section");

-- AddForeignKey
ALTER TABLE "ChatState" ADD CONSTRAINT "ChatState_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
