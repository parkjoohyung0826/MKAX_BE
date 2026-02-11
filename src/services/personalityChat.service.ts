import { genAI, GEMINI_MODEL } from "../common/gemini";
import { CoverLetterSection } from "@prisma/client";
import { getChatState, saveChatState } from "../repositories/coverLetterChat.repository";

export type PersonalityChatInput = {
  userInput: string;
  currentSummary?: string;
  sessionId: string;
};

export type PersonalityChatResult = {
  nextQuestion: string;
  summary: string;
  finalDraft: string;
  isComplete: boolean;
};

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

export async function chatPersonality(
  input: PersonalityChatInput
): Promise<PersonalityChatResult> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const stored = await getChatState(input.sessionId, CoverLetterSection.PERSONALITY);
  const baseSummary = normalize(input.currentSummary) || normalize(stored?.summary);

  const systemPrompt = `
너는 자기소개서 문항 중 "성격의 장단점"을 완성하기 위한 대화형 코치다.
아래 입력을 바탕으로 요약을 업데이트하고 다음 질문을 하나만 제시해라.
출력은 반드시 JSON 형식만 허용하며 다른 텍스트는 금지한다.

요구되는 정보(필수 슬롯):
1) 장점 1~2개와 이를 보여주는 구체적 사례(상황-행동-결과)
2) 단점 1개와 개선 노력(인식 + 행동 + 현재 변화)
3) 직무/업무와 연결되는 태도나 강점

규칙:
- 질문은 반드시 하나의 정보만 묻는 단일 문장으로, 1~2문장 내로 간결하게 작성한다.
- summary는 한국어로 간결하게 정리하며, 이미 있는 정보는 유지하고 새로운 정보로 갱신한다.
- 사용자가 수정/추가를 말하면 summary에 반영한다.
- 필수 슬롯이 모두 채워지면 isComplete를 true로 설정한다.
- isComplete가 true인 경우에도 nextQuestion은 "추가하거나 수정할 내용이 있나요?"처럼 수정 유도 질문을 한다.
- isComplete가 true일 때 finalDraft에 완성된 성격의 장단점 본문을 작성한다.
- finalDraft는 2~3개 단락, 총 8~12문장 분량으로 작성한다.
- finalDraft는 제목/머리말/불릿 없이 본문만 출력한다.
- 단점은 치명적 결함처럼 보이지 않게, 개선 노력을 강조한다.

반환 JSON 형식:
{
  "nextQuestion": string,
  "summary": string,
  "finalDraft": string,
  "isComplete": boolean
}
`;

  const userPrompt = JSON.stringify({
    userInput: input.userInput,
    currentSummary: baseSummary,
  });

  const result = await model.generateContent([systemPrompt, userPrompt]);
  try {
    console.log("[Open API raw response]", JSON.stringify(result, null, 2));
  } catch {
    console.log("[Open API raw response]", result);
  }
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
    await saveChatState(input.sessionId, CoverLetterSection.PERSONALITY, {
      summary: fallbackSummary,
      finalDraft: stored?.finalDraft ?? "",
      isComplete: stored?.isComplete ?? false,
    });
    return {
      nextQuestion: "강점 하나와 그걸 보여주는 구체적 사례를 알려주세요.",
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

  await saveChatState(input.sessionId, CoverLetterSection.PERSONALITY, {
    summary: nextResult.summary,
    finalDraft: nextResult.finalDraft,
    isComplete: nextResult.isComplete,
  });

  return nextResult;
}
