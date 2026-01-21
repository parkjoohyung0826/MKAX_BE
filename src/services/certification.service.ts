import { genAI, GEMINI_MODEL } from "../common/gemini";

export type RecommendCertificationResult = {
  fullDescription: string;
  period: string;
  certificationName: string;
  institution: string;
};

export async function recommendCertificationFromInput(
  userInput: string
): Promise<RecommendCertificationResult> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const systemPrompt = `
너는 이력서 작성 도우미야.
사용자의 자격증/어학 관련 입력(userInput)을 이력서에 바로 붙여넣을 수 있게 정리해줘.

반드시 아래 JSON 형식으로만 출력해. (추가 텍스트 절대 금지)
{
  "fullDescription": string,
  "period": string,
  "certificationName": string,
  "institution": string
}

규칙:
- fullDescription은 반드시 줄바꿈 포함 가능한 1~3줄 형식으로 작성해.
  예) "정보처리기사 (2023.05)\\n- 발급기관: 한국산업인력공단"
  예) "TOEIC 900 (2023.08)\\n- 주관: ETS"
- period: "YYYY.MM" 또는 "YYYY.MM ~ YYYY.MM" (정확히 없으면 "미상")
- certificationName: 자격증명/시험명/어학시험명
- institution: 발급기관/주관기관 (없으면 "미상")
`;

  const result = await model.generateContent([systemPrompt, `userInput: ${userInput}`]);
  const text = result.response.text();

  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);

    return {
      fullDescription: String(parsed.fullDescription ?? ""),
      period: String(parsed.period ?? "미상"),
      certificationName: String(parsed.certificationName ?? ""),
      institution: String(parsed.institution ?? "미상"),
    };
  } catch {
    return {
      fullDescription: userInput.trim(),
      period: "미상",
      certificationName: "정리 필요",
      institution: "미상",
    };
  }
}
