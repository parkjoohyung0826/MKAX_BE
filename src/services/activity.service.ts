import { genAI, GEMINI_MODEL } from "../common/gemini";

export type RecommendActivityResult = {
  fullDescription: string;
  missingInfo: string;
  isComplete: boolean;
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
  const trimmedInput = userInput.trim();
  if (trimmedInput.length < 5) {
    return {
      fullDescription: "",
      missingInfo: "활동/교육 정보를 5글자 이상 입력해주세요.",
      isComplete: false,
    };
  }

  const systemPrompt = `
너는 이력서 "교육사항/대외활동" 정리 도우미야.
사용자 입력(userInput)을 바탕으로 아래 JSON 형식으로만 출력해. (추가 텍스트 절대 금지)

{
  "fullDescription": string,
  "missingInfo": string,
  "isComplete": boolean
}

규칙:
- fullDescription은 아래 형식(줄바꿈 포함)을 지켜.
  "<과정/활동명> (<기간>)\\n- 주요 역할: ...\\n- 주요 성과: ..."
- period는 "YYYY.MM ~ YYYY.MM" 또는 "YYYY.MM ~ 진행중" 형태 선호
- courseName: 활동/교육명 + (핵심역할/분야) 정도로 요약
- institution: 주최/기관/학교/재단/회사 등 추정 가능하면 채우고, 불명확하면 "미상"으로
- 내용은 과장하지 말고, 사용자 입력에 근거해서만 작성
- missingInfo: 아래 필수 항목 중 입력에서 확인되지 않는 항목이 있다면,
  사용자가 추가로 입력할 수 있도록 자연스러운 질문/요청 문장으로 작성.
  부족한 항목이 없다면 빈 문자열("").
- 필수 항목: courseName, period, institution.
- 입력 길이가 5자 미만이면 missingInfo에 "활동/교육 정보를 5글자 이상 입력해주세요."를 출력하고
  fullDescription은 반드시 빈 문자열("")로 둔다.
- 입력이 활동/교육과 무관하거나 추출할 정보가 전혀 없으면,
  missingInfo에 올바른 활동/교육 정보를 요청하는 문장을 작성하고
  fullDescription은 반드시 빈 문자열("")로 둔다.
- isComplete: 필수 항목이 모두 충족되어 추가 입력이 필요 없으면 true, 아니면 false.
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
    return {
      fullDescription: "",
      missingInfo: "",
      isComplete: false,
    };
  }

  const missingInfo = String(parsed.missingInfo ?? "");
  const isComplete =
    typeof parsed.isComplete === "boolean"
      ? parsed.isComplete
      : missingInfo.trim().length === 0;

  return {
    fullDescription:
      missingInfo.trim().length > 0 ? "" : String(parsed.fullDescription ?? ""),
    missingInfo,
    isComplete,
  };
}
