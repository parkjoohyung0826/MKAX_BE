import { prisma } from "../infra/db/prisma";

export async function getCoverLetterState(sessionId: string) {
  return prisma.chatState.findMany({
    where: { sessionId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getRecommendState(sessionId: string) {
  return prisma.recommendState.findMany({
    where: { sessionId },
    orderBy: { updatedAt: "desc" },
  });
}
