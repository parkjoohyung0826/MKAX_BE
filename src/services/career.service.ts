import { genAI, GEMINI_MODEL } from "../common/gemini";
import { findPeriodOrderIssues } from "../common/periodValidation";

export type CareerResult = {
  fullDescription: string;
  missingInfo: string;
  isComplete: boolean;
};

export async function recommendCareerFromInput(
  userInput: string
): Promise<CareerResult> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const trimmedInput = userInput.trim();
  if (trimmedInput.length < 5) {
    return {
      fullDescription: "",
      missingInfo: "경력 정보를 5글자 이상 입력해주세요.",
      isComplete: false,
    };
  }
  const periodIssues = findPeriodOrderIssues(trimmedInput);
  if (periodIssues.length > 0) {
    const first = periodIssues[0];
    return {
      fullDescription: "",
      missingInfo: `경력 기간이 올바르지 않아요. 시작일(${first.start})은 종료일(${first.end})보다 이전이어야 해요. 기간을 다시 확인해주세요.`,
      isComplete: false,
    };
  }

  const systemPrompt = `
너는 이력서 작성을 도와주는 AI야.
사용자의 경력 설명을 이력서 형식에 맞게 정리해.

반드시 아래 JSON 형식으로만 응답해.
추가 설명이나 마크다운 없이 JSON만 출력해.

{
  "fullDescription": string,
  "missingInfo": string,
  "isComplete": boolean
}

규칙:
- fullDescription은 줄바꿈 포함 이력서용 문장
- period 예: "2021.01 ~ 재직중"
- period의 시작일은 종료일보다 반드시 이전이어야 한다. (같거나 더 늦으면 isComplete=false)
- leavingReason은 "재직중" 또는 퇴사 사유
- missingInfo: 아래 필수 항목 중 입력에서 확인되지 않는 항목이 있다면,
  사용자가 추가로 입력할 수 있도록 자연스러운 질문/요청 문장으로 작성.
  부족한 항목이 없다면 빈 문자열("").
- missingInfo는 친절한 대화체의 한 문장으로 작성하고, 가능하면 사용자가 입력한 표현을 일부 반영한다.
- 필수 항목: companyName, period, mainTask, leavingReason.
- 입력 길이가 5자 미만이면 missingInfo에 "경력 정보를 5글자 이상 입력해주세요."를 출력하고
  fullDescription은 반드시 빈 문자열("")로 둔다.
- 필수 항목이 일부 부족하더라도, 입력에 포함된 정보만으로 fullDescription을 최대한 작성한다.
- 입력이 경력과 무관하거나 추출할 정보가 전혀 없으면,
  missingInfo에 올바른 경력 정보를 요청하는 문장을 작성하고
  fullDescription은 반드시 빈 문자열("")로 둔다.
- isComplete: 필수 항목이 모두 충족되어 추가 입력이 필요 없으면 true, 아니면 false.
`;

  const userPrompt = `경력 설명: ${userInput}`;

  const result = await model.generateContent([systemPrompt, userPrompt]);
  const text = result.response.text();

  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  console.log("response:", cleaned);

  try {
    const parsed = JSON.parse(cleaned);
    const missingInfo = String(parsed.missingInfo ?? "");
    const isComplete =
      typeof parsed.isComplete === "boolean"
        ? parsed.isComplete
        : missingInfo.trim().length === 0;
    return {
      fullDescription: String(parsed.fullDescription ?? ""),
      missingInfo,
      isComplete,
    };
  } catch {
    return {
      fullDescription: "",
      missingInfo: "",
      isComplete: false,
    };
  }
}
