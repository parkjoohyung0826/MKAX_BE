import { CoverLetterSection } from "@prisma/client";
import { genAI, GEMINI_MODEL } from "../common/gemini";
import { getChatState, saveChatState } from "../repositories/coverLetterChat.repository";

export type CoverLetterChatFlowInput = {
  userInput: string;
  currentSummary?: string;
  sessionId: string;
};

export type CoverLetterChatFlowResult = {
  nextQuestion: string;
  summary: string;
  finalDraft: string;
  isComplete: boolean;
};

type ExecuteCoverLetterChatFlowParams = {
  input: CoverLetterChatFlowInput;
  section: CoverLetterSection;
  systemPrompt: string;
  fallbackQuestion: string;
};

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

export async function executeCoverLetterChatFlow(
  params: ExecuteCoverLetterChatFlowParams
): Promise<CoverLetterChatFlowResult> {
  const { input, section, systemPrompt, fallbackQuestion } = params;
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const stored = await getChatState(input.sessionId, section);
  const baseSummary = normalize(input.currentSummary) || normalize(stored?.summary);

  const userPrompt = JSON.stringify({
    userInput: input.userInput,
    currentSummary: baseSummary,
  });

  const result = await model.generateContent([systemPrompt, userPrompt]);
  const text = result.response.text();

  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const fallbackSummary = baseSummary;
    await saveChatState(input.sessionId, section, {
      summary: fallbackSummary,
      finalDraft: stored?.finalDraft ?? "",
      isComplete: stored?.isComplete ?? false,
    });
    return {
      nextQuestion: fallbackQuestion,
      summary: fallbackSummary,
      finalDraft: "",
      isComplete: false,
    };
  }

  const nextResult = {
    nextQuestion: normalize(parsed.nextQuestion),
    summary: normalize(parsed.summary) || baseSummary,
    finalDraft: normalize(parsed.finalDraft),
    isComplete: Boolean(parsed.isComplete),
  };

  await saveChatState(input.sessionId, section, {
    summary: nextResult.summary,
    finalDraft: nextResult.finalDraft,
    isComplete: nextResult.isComplete,
  });

  return nextResult;
}
