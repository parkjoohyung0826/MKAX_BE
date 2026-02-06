import { genAI, GEMINI_MODEL } from "../common/gemini";

export type RecommendEducationResult = {
  fullDescription: string;
  missingInfo: string;
  isComplete: boolean;
};

export async function recommendEducationFromDescription(
  description: string
): Promise<RecommendEducationResult> {
  console.log("Input:", description);

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const trimmedDescription = description.trim();
  if (trimmedDescription.length < 5) {
    return {
      fullDescription: "",
      missingInfo: "학력 정보를 5글자 이상 입력해주세요.",
      isComplete: false,
    };
  }

  const systemPrompt = `
너는 이력서 작성 도우미야.
사용자가 입력한 학력 관련 줄글(description)을 분석해서 이력서 학력 양식에 맞게 구조화해.

반드시 아래 JSON 형식으로만 출력해. (추가 텍스트/설명 절대 금지)
{
  "fullDescription": string,
  "missingInfo": string,
  "isComplete": boolean
}

규칙:
- schoolName: 학교명(가능하면 공식 명칭)
- major: 전공명
- period: "YYYY.MM ~ YYYY.MM" 형태 우선, 모르면 원문에서 가능한 범위로 유지
- graduationStatus: "졸업" | "재학" | "휴학" | "수료" | "중퇴" | "졸업예정" 중 하나로 매핑(추론 가능)
- details: 핵심만 2~4줄 요약(줄바꿈 포함 가능). 예:
  "주요 수강 과목: ...\\n졸업 프로젝트: ..."
- fullDescription: 이력서에 그대로 붙여넣을 수 있는 포맷으로 정리.
  예:
  "OO대학교 컴퓨터공학과 졸업 (2018.03 ~ 2024.02)\\n- 주요 수강 과목: ...\\n- 졸업 프로젝트: ..."
- missingInfo: 아래 필수 항목 중 입력에서 확인되지 않는 항목이 있다면,
  사용자가 추가로 입력할 수 있도록 자연스러운 질문/요청 문장으로 작성.
  부족한 항목이 없다면 빈 문자열("").
- missingInfo는 친절한 대화체의 한 문장으로 작성하고, 가능하면 사용자가 입력한 표현을 일부 반영한다.
- 필수 항목: schoolName, major, period, graduationStatus, details.
- 입력 길이가 5자 미만이면 missingInfo에 "학력 정보를 5글자 이상 입력해주세요."를 출력하고
  fullDescription은 반드시 빈 문자열("")로 둔다.
- 필수 항목이 일부 부족하더라도, 입력에 포함된 정보만으로 fullDescription을 최대한 작성한다.
- 입력이 학력과 무관하거나 추출할 정보가 전혀 없으면,
  missingInfo에 올바른 학력 정보를 요청하는 문장을 작성하고
  fullDescription은 반드시 빈 문자열("")로 둔다.
- isComplete: 필수 항목이 모두 충족되어 추가 입력이 필요 없으면 true, 아니면 false.
- 정보가 없으면 빈 문자열("")로 둬.
  `;

  const userPrompt = `description: ${description}`;

  console.log("Calling Gemini API...");
  const result = await model.generateContent([systemPrompt, userPrompt]);
  const text = result.response.text();

  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  console.log("response:", cleaned);

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("❌ JSON parse failed:", err);
    // fallback
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
    fullDescription: String(parsed.fullDescription ?? ""),
    missingInfo,
    isComplete,
  };
}
