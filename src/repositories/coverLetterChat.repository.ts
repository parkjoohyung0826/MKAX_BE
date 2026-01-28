import { prisma } from "../infra/db/prisma";
import { CoverLetterSection } from "@prisma/client";

export async function ensureChatSession(sessionId: string) {
  await prisma.chatSession.upsert({
    where: { id: sessionId },
    update: {},
    create: { id: sessionId },
  });
}

export async function getChatState(
  sessionId: string,
  section: CoverLetterSection
) {
  return prisma.chatState.findUnique({
    where: {
      sessionId_section: {
        sessionId,
        section,
      },
    },
  });
}

export async function saveChatState(
  sessionId: string,
  section: CoverLetterSection,
  data: { summary: string; finalDraft: string; isComplete: boolean }
) {
  await ensureChatSession(sessionId);
  return prisma.chatState.upsert({
    where: {
      sessionId_section: {
        sessionId,
        section,
      },
    },
    update: {
      summary: data.summary,
      finalDraft: data.finalDraft,
      isComplete: data.isComplete,
    },
    create: {
      sessionId,
      section,
      summary: data.summary,
      finalDraft: data.finalDraft,
      isComplete: data.isComplete,
    },
  });
}

export async function resetChatSession(
  sessionId: string,
  section?: CoverLetterSection
) {
  if (section) {
    await prisma.chatState.deleteMany({ where: { sessionId, section } });
    return;
  }
  await prisma.chatState.deleteMany({ where: { sessionId } });
}
