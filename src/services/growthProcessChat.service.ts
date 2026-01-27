import { genAI, GEMINI_MODEL } from "../common/gemini";

export type GrowthProcessChatInput = {
  userInput: string;
  currentSummary?: string;
};

export type GrowthProcessChatResult = {
  nextQuestion: string;
  summary: string;
  finalDraft: string;
  isComplete: boolean;
};

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

export async function chatGrowthProcess(
  input: GrowthProcessChatInput
): Promise<GrowthProcessChatResult> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const systemPrompt = `
너는 자기소개서 문항 중 "성장과정"을 완성하기 위한 대화형 코치다.
아래 입력을 바탕으로 요약을 업데이트하고 다음 질문을 하나만 제시해라.
출력은 반드시 JSON 형식만 허용하며 다른 텍스트는 금지한다.

요구되는 정보(필수 슬롯):
1) 성장 배경/환경(가정, 학교, 지역 등 핵심 맥락)
2) 중요한 경험 1~2개 (상황-행동-결과)
3) 경험에서 형성된 가치관/태도/역량
4) 지원 직무/분야와의 연결(직무가 없다면 직무/분야를 묻는다)

규칙:
- 질문은 반드시 하나의 정보만 묻는 단일 문장으로, 1~2문장 내로 간결하게 작성한다.
- summary는 한국어로 간결하게 정리하며, 이미 있는 정보는 유지하고 새로운 정보로 갱신한다.
- 사용자가 수정/추가를 말하면 summary에 반영한다.
- 필수 슬롯이 모두 채워지면 isComplete를 true로 설정한다.
- isComplete가 true인 경우에도 nextQuestion은 "추가하거나 수정할 내용이 있나요?"처럼 수정 유도 질문을 한다.
- isComplete가 true일 때 finalDraft에 완성된 성장과정 본문을 작성한다.
- finalDraft는 2~4개 단락, 총 8~12문장 분량으로 작성한다.
- finalDraft는 제목/머리말/불릿 없이 본문만 출력한다.

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
    currentSummary: input.currentSummary ?? "",
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
    return {
      nextQuestion: "성장과정에서 중요한 경험 한 가지를 구체적으로 알려주세요.",
      summary: normalize(input.currentSummary),
      finalDraft: "",
      isComplete: false,
    };
  }

  return {
    nextQuestion: normalize(parsed.nextQuestion),
    summary: normalize(parsed.summary) || normalize(input.currentSummary),
    finalDraft: normalize(parsed.finalDraft),
    isComplete: Boolean(parsed.isComplete),
  };
}
