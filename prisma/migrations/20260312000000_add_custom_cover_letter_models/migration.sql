-- CreateTable
CREATE TABLE "CustomCoverLetterSet" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "companyName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomCoverLetterSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomCoverLetterQuestion" (
    "id" SERIAL NOT NULL,
    "setId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "hasCharacterLimit" BOOLEAN NOT NULL DEFAULT false,
    "characterLimit" INTEGER,
    "systemPrompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomCoverLetterQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomCoverLetterChatState" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" INTEGER NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "finalDraft" TEXT NOT NULL DEFAULT '',
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomCoverLetterChatState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomCoverLetterSet_sessionId_idx" ON "CustomCoverLetterSet"("sessionId");

-- CreateIndex
CREATE INDEX "CustomCoverLetterQuestion_setId_idx" ON "CustomCoverLetterQuestion"("setId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomCoverLetterChatState_sessionId_questionId_key" ON "CustomCoverLetterChatState"("sessionId", "questionId");

-- CreateIndex
CREATE INDEX "CustomCoverLetterChatState_questionId_idx" ON "CustomCoverLetterChatState"("questionId");

-- AddForeignKey
ALTER TABLE "CustomCoverLetterSet" ADD CONSTRAINT "CustomCoverLetterSet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomCoverLetterQuestion" ADD CONSTRAINT "CustomCoverLetterQuestion_setId_fkey" FOREIGN KEY ("setId") REFERENCES "CustomCoverLetterSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomCoverLetterChatState" ADD CONSTRAINT "CustomCoverLetterChatState_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomCoverLetterChatState" ADD CONSTRAINT "CustomCoverLetterChatState_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CustomCoverLetterQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
