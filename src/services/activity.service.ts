import { genAI, GEMINI_MODEL } from "../common/gemini";

export type RecommendActivityResult = {
  fullDescription: string;
  period: string;
  courseName: string;
  institution: string;
};

function stripCodeFence(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export async function recommendActivityFromUserInput(
  userInput: string
): Promise<RecommendActivityResult> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const systemPrompt = `
너는 이력서 "교육사항/대외활동" 정리 도우미야.
사용자 입력(userInput)을 바탕으로 아래 JSON 형식으로만 출력해. (추가 텍스트 절대 금지)

{
  "fullDescription": string,
  "period": string,
  "courseName": string,
  "institution": string
}

규칙:
- fullDescription은 아래 형식(줄바꿈 포함)을 지켜.
  "<과정/활동명> (<기간>)\\n- 주요 역할: ...\\n- 주요 성과: ..."
- period는 "YYYY.MM ~ YYYY.MM" 또는 "YYYY.MM ~ 진행중" 형태 선호
- courseName: 활동/교육명 + (핵심역할/분야) 정도로 요약
- institution: 주최/기관/학교/재단/회사 등 추정 가능하면 채우고, 불명확하면 "미상"으로
- 내용은 과장하지 말고, 사용자 입력에 근거해서만 작성
`;

  const prompt = `userInput: ${userInput}`;

  const result = await model.generateContent([systemPrompt, prompt]);
  const text = result.response.text();
  const cleaned = stripCodeFence(text);

  console.log("response:", cleaned);

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // 모델이 형식 깨뜨렸을 때 fallback
    return {
      fullDescription: "활동 정보를 다시 생성해주세요",
      period: "",
      courseName: "",
      institution: "미상",
    };
  }

  return {
    fullDescription: String(parsed.fullDescription ?? ""),
    period: String(parsed.period ?? ""),
    courseName: String(parsed.courseName ?? ""),
    institution: String(parsed.institution ?? "미상"),
  };
}
