import { genAI, GEMINI_MODEL } from "../common/gemini";
import {
  getCustomChatState,
  getCustomQuestionById,
  saveCustomChatState,
} from "../repositories/customCoverLetter.repository";

export type CustomCoverLetterChatInput = {
  sessionId: string;
  questionId: number;
  userInput: string;
  currentSummary?: string;
};

export type CustomCoverLetterChatResult = {
  nextQuestion: string;
  summary: string;
  finalDraft: string;
  isComplete: boolean;
};

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

function buildFallbackQuestion(title: string) {
  return `문항 "${title}"에 맞춰 핵심 경험 1가지를 먼저 구체적으로 알려주세요.`;
}

function trimToCharacterLimit(value: string, limit: number | null) {
  if (typeof limit !== "number") return value;
  if (value.length <= limit) return value;
  return value.slice(0, limit).trimEnd();
}

export async function chatCustomCoverLetterQuestion(
  input: CustomCoverLetterChatInput
): Promise<CustomCoverLetterChatResult> {
  const question = await getCustomQuestionById(input.sessionId, input.questionId);

  if (!question) {
    throw {
      status: 404,
      message: "해당 커스텀 문항을 찾을 수 없습니다.",
    };
  }

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const stored = await getCustomChatState(input.sessionId, input.questionId);

  const baseSummary = normalize(input.currentSummary) || normalize(stored?.summary);

  const userPrompt = JSON.stringify({
    userInput: input.userInput,
    currentSummary: baseSummary,
  });

  try {
    const result = await model.generateContent([question.systemPrompt, userPrompt]);
    const text = result.response.text();

    const cleaned = text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as {
      nextQuestion?: unknown;
      summary?: unknown;
      finalDraft?: unknown;
      isComplete?: unknown;
    };

    const normalizedFinalDraft = trimToCharacterLimit(
      normalize(parsed.finalDraft),
      question.characterLimit
    );

    const nextResult: CustomCoverLetterChatResult = {
      nextQuestion: normalize(parsed.nextQuestion) || buildFallbackQuestion(question.title),
      summary: normalize(parsed.summary) || baseSummary,
      finalDraft: normalizedFinalDraft,
      isComplete: Boolean(parsed.isComplete),
    };

    await saveCustomChatState(input.sessionId, input.questionId, {
      summary: nextResult.summary,
      finalDraft: nextResult.finalDraft,
      isComplete: nextResult.isComplete,
    });

    return nextResult;
  } catch {
    const fallbackSummary = baseSummary;
    const fallbackFinalDraft = trimToCharacterLimit(
      normalize(stored?.finalDraft),
      question.characterLimit
    );

    await saveCustomChatState(input.sessionId, input.questionId, {
      summary: fallbackSummary,
      finalDraft: fallbackFinalDraft,
      isComplete: false,
    });

    return {
      nextQuestion: buildFallbackQuestion(question.title),
      summary: fallbackSummary,
      finalDraft: fallbackFinalDraft,
      isComplete: false,
    };
  }
}
