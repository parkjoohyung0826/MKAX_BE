import { genAI, GEMINI_MODEL } from "../common/gemini";

export type RecommendCertificationResult = {
  fullDescription: string;
  missingInfo: string;
  isComplete: boolean;
};

type CertificationMode = "basic" | "senior";

export async function recommendCertificationFromInput(
  userInput: string
): Promise<RecommendCertificationResult> {
  return recommendCertificationByMode(userInput, "basic");
}

export async function recommendSeniorLicenseSkillFromInput(
  userInput: string
): Promise<RecommendCertificationResult> {
  return recommendCertificationByMode(userInput, "senior");
}

async function recommendCertificationByMode(
  userInput: string,
  mode: CertificationMode
): Promise<RecommendCertificationResult> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const trimmedInput = userInput.trim();
  if (trimmedInput.length < 5) {
    return {
      fullDescription: "",
      missingInfo:
        mode === "senior"
          ? "면허/자격증 및 사용 가능 기기 정보를 5글자 이상 입력해주세요."
          : "자격증/어학 정보를 5글자 이상 입력해주세요.",
      isComplete: false,
    };
  }

  const basicSystemPrompt = `
너는 이력서 작성 도우미야.
사용자의 자격증/어학 관련 입력(userInput)을 이력서에 바로 붙여넣을 수 있게 정리해줘.

반드시 아래 JSON 형식으로만 출력해. (추가 텍스트 절대 금지)
{
  "certificationName": string,
  "period": string,
  "institution": string,
  "fullDescription": string,
  "missingInfo": string,
  "isComplete": boolean
}

규칙:
- fullDescription은 반드시 줄바꿈 포함 가능한 1~3줄 형식으로 작성해.
  예) "정보처리기사 (2023.05)\\n- 발급기관: 한국산업인력공단"
  예) "TOEIC 900 (2023.08)\\n- 주관: ETS"
- period: "YYYY.MM" 또는 "YYYY.MM ~ YYYY.MM" (없거나 모호하면 빈 문자열(""))
- certificationName: 자격증명/시험명/어학시험명
- institution: 발급기관/주관기관 (입력 근거가 없으면 빈 문자열(""))
- missingInfo: 아래 필수 항목 중 입력에서 확인되지 않는 항목이 있다면,
  사용자가 추가로 입력할 수 있도록 자연스러운 질문/요청 문장으로 작성.
  부족한 항목이 없다면 빈 문자열("").
- missingInfo는 친절한 대화체의 한 문장으로 작성하고, 가능하면 사용자가 입력한 표현을 일부 반영한다.
- 필수 항목: certificationName, period, institution.
- 완료 판정 규칙(매우 중요):
  1) certificationName, period, institution 3개가 모두 사용자 입력에서 확인될 때만 isComplete=true.
  2) 하나라도 없거나 모호하면 isComplete=false.
  3) period 형식이 맞지 않으면 isComplete=false.
  4) isComplete=true 인 경우 missingInfo는 반드시 빈 문자열("").
  5) isComplete=false 인 경우 missingInfo는 반드시 비어 있지 않아야 하며, 가장 우선순위 높은 누락 1개만 질문한다.
- 입력 길이가 5자 미만이면 missingInfo에 "자격증/어학 정보를 5글자 이상 입력해주세요."를 출력하고
  fullDescription은 반드시 빈 문자열("")로 둔다.
- 필수 항목이 일부 부족하더라도, 입력에 포함된 정보만으로 fullDescription을 최대한 작성한다.
- 입력이 자격증/어학과 무관하거나 추출할 정보가 전혀 없으면,
  missingInfo에 올바른 자격증/어학 정보를 요청하는 문장을 작성하고
  fullDescription은 반드시 빈 문자열("")로 둔다.
- isComplete: 필수 항목이 모두 충족되어 추가 입력이 필요 없으면 true, 아니면 false.
`;

  const seniorSystemPrompt = `
너는 시니어 구직자 이력서의 "면허/자격증 및 사용 가능 기기" 정리 도우미야.
사용자 입력(userInput)을 바탕으로 아래 JSON 형식으로만 출력해. (추가 텍스트 절대 금지)

{
  "certificationName": string,
  "period": string,
  "institution": string,
  "fullDescription": string,
  "missingInfo": string,
  "isComplete": boolean
}

규칙:
- fullDescription은 1~3줄로 작성한다.
  예) "1종 보통 운전면허 (2020.03)\\n- 발급기관: 경찰청"
  예) "스마트폰 활용 능숙 (기간 정보 없음)\\n- 활용: 메시지/지도/사진 전송/앱 설치"
- certificationName: 면허, 자격증, 사용 가능 기기/디지털 활용 역량명
- period: "YYYY.MM" 또는 "YYYY.MM ~ YYYY.MM" (없거나 모호하면 빈 문자열(""))
- institution: 발급기관/주관기관/훈련기관 (기기 활용 능력처럼 기관이 없으면 빈 문자열 가능)
- missingInfo: 아래 필수 항목 중 입력에서 확인되지 않는 항목이 있으면 한 문장으로 질문한다.
- 필수 항목:
  1) certificationName
  2) period
  3) institution (단, 기관 정보가 본질적으로 없는 기기 활용 항목은 예외로 허용)
- 완료 판정 규칙(매우 중요):
  1) certificationName, period가 확인되고, institution이 있거나 기관 예외에 해당할 때 isComplete=true.
  2) 하나라도 없거나 모호하면 isComplete=false.
  3) period 형식이 맞지 않으면 isComplete=false.
  4) isComplete=true 인 경우 missingInfo는 반드시 빈 문자열("").
  5) isComplete=false 인 경우 missingInfo는 반드시 비어 있지 않아야 하며, 가장 우선순위 높은 누락 1개만 질문한다.
- 어학 점수/시험 정보는 시니어 모드에서 핵심이 아니므로 후순위로 반영한다.
- 입력 길이가 5자 미만이면 missingInfo에 "면허/자격증 및 사용 가능 기기 정보를 5글자 이상 입력해주세요."를 출력하고 fullDescription은 빈 문자열("")로 둔다.
`;

  const systemPrompt =
    mode === "senior" ? seniorSystemPrompt : basicSystemPrompt;

  const result = await model.generateContent([
    systemPrompt,
    `userInput: ${userInput}`,
  ]);
  const text = result.response.text();

  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);

    const missingInfo = String(parsed.missingInfo ?? "").trim();
    const isComplete =
      typeof parsed.isComplete === "boolean"
        ? parsed.isComplete
        : missingInfo.length === 0;
    return {
      fullDescription: String(parsed.fullDescription ?? "").trim(),
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
