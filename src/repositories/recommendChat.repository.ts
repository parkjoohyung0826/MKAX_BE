import { prisma } from "../infra/db/prisma";
import { RecommendSection } from "@prisma/client";
import { ensureChatSession } from "./coverLetterChat.repository";

export async function getRecommendState(
  sessionId: string,
  section: RecommendSection
) {
  return prisma.recommendState.findUnique({
    where: {
      sessionId_section: {
        sessionId,
        section,
      },
    },
  });
}

export async function saveRecommendState(
  sessionId: string,
  section: RecommendSection,
  accumulatedInput: string
) {
  await ensureChatSession(sessionId);
  return prisma.recommendState.upsert({
    where: {
      sessionId_section: {
        sessionId,
        section,
      },
    },
    update: {
      accumulatedInput,
    },
    create: {
      sessionId,
      section,
      accumulatedInput,
    },
  });
}

export async function resetRecommendSession(
  sessionId: string,
  section?: RecommendSection
) {
  if (section) {
    await prisma.recommendState.deleteMany({ where: { sessionId, section } });
    return;
  }
  await prisma.recommendState.deleteMany({ where: { sessionId } });
}
