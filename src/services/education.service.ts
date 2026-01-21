import { genAI, GEMINI_MODEL } from "../common/gemini";

export type RecommendEducationResult = {
  schoolName: string;
  major: string;
  period: string;
  graduationStatus: string;
  details: string;
  fullDescription: string;
};

export async function recommendEducationFromDescription(
  description: string
): Promise<RecommendEducationResult> {
  console.log("Input:", description);

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const systemPrompt = `
너는 이력서 작성 도우미야.
사용자가 입력한 학력 관련 줄글(description)을 분석해서 이력서 학력 양식에 맞게 구조화해.

반드시 아래 JSON 형식으로만 출력해. (추가 텍스트/설명 절대 금지)
{
  "schoolName": string,
  "major": string,
  "period": string,
  "graduationStatus": string,
  "details": string,
  "fullDescription": string
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
      schoolName: "",
      major: "",
      period: "",
      graduationStatus: "",
      details: "",
      fullDescription: "",
    };
  }

  return {
    schoolName: String(parsed.schoolName ?? ""),
    major: String(parsed.major ?? ""),
    period: String(parsed.period ?? ""),
    graduationStatus: String(parsed.graduationStatus ?? ""),
    details: String(parsed.details ?? ""),
    fullDescription: String(parsed.fullDescription ?? ""),
  };
}
