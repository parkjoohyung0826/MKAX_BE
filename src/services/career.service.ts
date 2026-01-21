import { genAI, GEMINI_MODEL } from "../common/gemini";

export type CareerResult = {
  fullDescription: string;
  companyName: string;
  period: string;
  mainTask: string;
  leavingReason: string;
};

export async function recommendCareerFromInput(
  userInput: string
): Promise<CareerResult> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const systemPrompt = `
너는 이력서 작성을 도와주는 AI야.
사용자의 경력 설명을 이력서 형식에 맞게 정리해.

반드시 아래 JSON 형식으로만 응답해.
추가 설명이나 마크다운 없이 JSON만 출력해.

{
  "fullDescription": string,
  "companyName": string,
  "period": string,
  "mainTask": string,
  "leavingReason": string
}

규칙:
- fullDescription은 줄바꿈 포함 이력서용 문장
- period 예: "2021.01 ~ 재직중"
- leavingReason은 "재직중" 또는 퇴사 사유
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
    return {
      fullDescription: String(parsed.fullDescription ?? ""),
      companyName: String(parsed.companyName ?? ""),
      period: String(parsed.period ?? ""),
      mainTask: String(parsed.mainTask ?? ""),
      leavingReason: String(parsed.leavingReason ?? ""),
    };
  } catch {
    return {
      fullDescription: "",
      companyName: "",
      period: "",
      mainTask: "",
      leavingReason: "",
    };
  }
}
