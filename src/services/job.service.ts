import { genAI, GEMINI_MODEL } from "../common/gemini";

export type RecommendJobResult = {
  recommendedJob: string;
  reason: string;
};

export async function recommendJobFromDescription(
  description: string
): Promise<RecommendJobResult> {
  console.log("Input description:", description);

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const systemPrompt = `
너는 채용/직무 추천 도우미야.
사용자 경험 설명(description)을 보고 "추천 직무명"과 "추천 이유"를 만들어.
반드시 아래 JSON 형식으로만 출력해. (추가 텍스트 절대 금지)
{
  "recommendedJob": string,
  "reason": string
}
reason은 1~2문장으로 간결하게.
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
    return {
      recommendedJob: "추천 직무를 다시 생성해주세요",
      reason: "AI 응답 형식이 올바르지 않아 재시도가 필요합니다.",
    };
  }

  return {
    recommendedJob: String(parsed.recommendedJob ?? ""),
    reason: String(parsed.reason ?? ""),
  };
}
