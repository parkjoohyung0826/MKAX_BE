import { prisma } from "../infra/db/prisma";
import { ensureChatSession } from "./coverLetterChat.repository";

type CreateCustomSetInput = {
  sessionId: string;
  companyName?: string;
  questions: Array<{
    order: number;
    title: string;
    hasCharacterLimit: boolean;
    characterLimit: number | null;
    systemPrompt: string;
  }>;
};

export async function createCustomCoverLetterSet(input: CreateCustomSetInput) {
  await ensureChatSession(input.sessionId);

  return prisma.customCoverLetterSet.create({
    data: {
      sessionId: input.sessionId,
      companyName: input.companyName?.trim() || null,
      questions: {
        create: input.questions.map((question) => ({
          order: question.order,
          title: question.title,
          hasCharacterLimit: question.hasCharacterLimit,
          characterLimit: question.characterLimit,
          systemPrompt: question.systemPrompt,
        })),
      },
    },
    include: {
      questions: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });
}

export async function getCustomQuestionById(sessionId: string, questionId: number) {
  return prisma.customCoverLetterQuestion.findFirst({
    where: {
      id: questionId,
      set: {
        sessionId,
      },
    },
  });
}

export async function getCustomChatState(sessionId: string, questionId: number) {
  return prisma.customCoverLetterChatState.findUnique({
    where: {
      sessionId_questionId: {
        sessionId,
        questionId,
      },
    },
  });
}

export async function saveCustomChatState(
  sessionId: string,
  questionId: number,
  data: { summary: string; finalDraft: string; isComplete: boolean }
) {
  await ensureChatSession(sessionId);

  return prisma.customCoverLetterChatState.upsert({
    where: {
      sessionId_questionId: {
        sessionId,
        questionId,
      },
    },
    update: {
      summary: data.summary,
      finalDraft: data.finalDraft,
      isComplete: data.isComplete,
    },
    create: {
      sessionId,
      questionId,
      summary: data.summary,
      finalDraft: data.finalDraft,
      isComplete: data.isComplete,
    },
  });
}

export async function resetCustomChatState(
  sessionId: string,
  input: { questionId?: number; setId?: number }
) {
  if (typeof input.questionId === "number") {
    await prisma.customCoverLetterChatState.deleteMany({
      where: {
        sessionId,
        questionId: input.questionId,
      },
    });
    return;
  }

  if (typeof input.setId === "number") {
    const questions = await prisma.customCoverLetterQuestion.findMany({
      where: {
        setId: input.setId,
        set: {
          sessionId,
        },
      },
      select: { id: true },
    });

    const questionIds = questions.map((item) => item.id);
    if (questionIds.length === 0) {
      return;
    }

    await prisma.customCoverLetterChatState.deleteMany({
      where: {
        sessionId,
        questionId: { in: questionIds },
      },
    });
    return;
  }

  await prisma.customCoverLetterChatState.deleteMany({
    where: { sessionId },
  });
}
