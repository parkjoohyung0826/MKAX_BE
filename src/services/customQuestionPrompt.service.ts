import { genAI, GEMINI_MODEL } from "../common/gemini";

export type DynamicQuestionPromptInput = {
  questionTitle: string;
  hasCharacterLimit: boolean;
  characterLimit?: number | null;
};

export type DynamicQuestionPromptResult = {
  questionTitle: string;
  hasCharacterLimit: boolean;
  characterLimit: number | null;
  systemPrompt: string;
};

export async function buildDynamicQuestionPrompts(
  questions: DynamicQuestionPromptInput[]
): Promise<DynamicQuestionPromptResult[]> {
  const normalized = questions.map((question) => ({
    questionTitle: question.questionTitle.trim(),
    hasCharacterLimit: Boolean(question.hasCharacterLimit),
    characterLimit:
      question.hasCharacterLimit && typeof question.characterLimit === "number"
        ? question.characterLimit
        : null,
  }));

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const systemPrompt = `
너는 자기소개서 문항별 챗봇 시스템 프롬프트 설계 전문가다.
입력으로 받은 여러 문항 각각에 대해, 해당 문항 작성 챗봇에서 바로 사용할 수 있는 systemPrompt를 생성한다.

systemPrompt 작성 규칙:
- 문항 의도를 해석해, 어떤 정보 슬롯이 필요한지 4~6개로 구체화한다.
- 챗봇은 사용자와 대화하며 summary를 누적하고 nextQuestion을 1개씩 묻는 방식이어야 한다.
- 출력 형식은 JSON만 허용하도록 강하게 지시한다.
- 최종 본문(finalDraft)은 제목/불릿 없이 자연스러운 자기소개서 본문으로 작성하도록 포함한다.
- 과장/허위 금지, 구체성(상황-행동-결과 또는 문제-해결-성과) 강조 지시를 반드시 포함한다.
- 한국어 문장으로 작성한다.
- 글자수 제한이 있으면 finalDraft 글자수 제한을 반드시 지키게 지시한다.
- 글자수 제한이 없으면 분량을 7~12문장 범위로 유도한다.

반드시 아래 JSON 형식으로만 출력:
{
  "prompts": [
    {
      "index": number,
      "systemPrompt": string
    }
  ]
}
`.trim();

  const userPrompt = JSON.stringify({ questions: normalized });

  try {
    const result = await model.generateContent([systemPrompt, userPrompt]);
    const text = result?.response?.text?.() ?? "";
    const cleaned = text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as {
      prompts?: Array<{ index?: number; systemPrompt?: string }>;
    };

    const promptMap = new Map<number, string>();
    for (const item of parsed.prompts ?? []) {
      if (typeof item.index !== "number") continue;
      if (typeof item.systemPrompt !== "string") continue;
      const normalizedPrompt = item.systemPrompt.trim();
      if (!normalizedPrompt) continue;
      promptMap.set(item.index, normalizedPrompt);
    }

    return normalized.map((question, index) => ({
      ...question,
      systemPrompt:
        promptMap.get(index) ??
        buildFallbackPrompt(question.questionTitle, question.characterLimit),
    }));
  } catch {
    return normalized.map((question) => ({
      ...question,
      systemPrompt: buildFallbackPrompt(
        question.questionTitle,
        question.characterLimit
      ),
    }));
  }
}

function buildFallbackPrompt(questionTitle: string, characterLimit: number | null) {
  const lengthRule =
    typeof characterLimit === "number"
      ? `- finalDraft는 공백 포함 ${characterLimit}자 이내로 작성한다.`
      : "- finalDraft는 총 7~12문장 분량으로 작성한다.";

  return `
너는 자기소개서 문항 "${questionTitle}"를 완성하기 위한 대화형 코치다.
아래 입력을 바탕으로 요약을 업데이트하고 다음 질문을 하나만 제시해라.
출력은 반드시 JSON 형식만 허용하며 다른 텍스트는 금지한다.

요구되는 정보(필수 슬롯):
1) 문항 의도와 직접 연결되는 핵심 경험 1~2개
2) 당시 상황과 맡은 역할
3) 본인이 취한 행동 또는 문제 해결 방식
4) 결과/성과 및 배운 점
5) 지원 직무/회사와의 연결 또는 기여 가능성

규칙:
- 질문은 반드시 하나의 정보만 묻는 단일 문장으로 작성한다.
- summary는 기존 정보를 유지하고 새 정보를 반영해 간결하게 갱신한다.
- 사용자가 수정/추가를 요청하면 summary와 finalDraft에 반영한다.
- finalDraft는 과장/허위 없이 구체적으로 작성한다.
- finalDraft는 제목/머리말/불릿 없이 본문만 작성한다.
${lengthRule}
- 필수 슬롯이 충분히 채워지면 isComplete를 true로 설정한다.
- isComplete가 true일 때 nextQuestion은 "추가하거나 수정할 내용이 있나요?"처럼 수정 유도 질문으로 작성한다.

반환 JSON 형식:
{
  "nextQuestion": string,
  "summary": string,
  "finalDraft": string,
  "isComplete": boolean
}
`.trim();
}
