import { genAI, GEMINI_MODEL } from "../common/gemini";

export type RecommendJobResult = {
  recommendedJob: string;
  missingInfo: string;
  isComplete: boolean;
};

export async function recommendJobFromDescription(
  description: string
): Promise<RecommendJobResult> {
  console.log("Input description:", description);

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const trimmedDescription = description.trim();
  if (trimmedDescription.length < 5) {
    return {
      recommendedJob: "",
      missingInfo: "경험/직무 관련 정보를 5글자 이상 입력해주세요.",
      isComplete: false,
    };
  }

  const systemPrompt = `
너는 채용/직무 추천 도우미야.
사용자 경험 설명(description)을 보고 "추천 직무명"과 "추천 이유"를 만들어.
반드시 아래 JSON 형식으로만 출력해. (추가 텍스트 절대 금지)
{
  "recommendedJob": string,
  "missingInfo": string,
  "isComplete": boolean
}
missingInfo: 아래 필수 항목 중 입력에서 확인되지 않는 항목이 있다면,
  사용자가 추가로 입력할 수 있도록 자연스러운 질문/요청 문장으로 작성.
  부족한 항목이 없다면 빈 문자열("").
필수 항목: recommendedJob.
입력 길이가 5자 미만이면 missingInfo에 "경험/직무 관련 정보를 5글자 이상 입력해주세요."를 출력하고
  recommendedJob은 반드시 빈 문자열("")로 둔다.
입력이 직무 추천과 무관하거나 추출할 정보가 전혀 없으면,
  missingInfo에 올바른 경험/직무 관련 정보를 요청하는 문장을 작성하고
  recommendedJob은 반드시 빈 문자열("")로 둔다.
isComplete: 필수 항목이 모두 충족되어 추가 입력이 필요 없으면 true, 아니면 false.
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
      recommendedJob: "",
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
    recommendedJob: missingInfo.trim().length > 0 ? "" : String(parsed.recommendedJob ?? ""),
    missingInfo,
    isComplete,
  };
}
