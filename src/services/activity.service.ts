import { genAI, GEMINI_MODEL } from "../common/gemini";

export type RecommendActivityResult = {
  fullDescription: string;
  missingInfo: string;
  isComplete: boolean;
};

type ActivityMode = "basic" | "senior";

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
  return recommendActivityByMode(userInput, "basic");
}

export async function recommendSeniorTrainingFromUserInput(
  userInput: string
): Promise<RecommendActivityResult> {
  return recommendActivityByMode(userInput, "senior");
}

async function recommendActivityByMode(
  userInput: string,
  mode: ActivityMode
): Promise<RecommendActivityResult> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const trimmedInput = userInput.trim();
  if (trimmedInput.length < 5) {
    return {
      fullDescription: "",
      missingInfo:
        mode === "senior"
          ? "직업 훈련/교육 이수 정보를 5글자 이상 입력해주세요."
          : "활동/교육 정보를 5글자 이상 입력해주세요.",
      isComplete: false,
    };
  }

  const basicSystemPrompt = `
너는 이력서 "교육사항/대외활동" 정리 도우미야.
사용자 입력(userInput)을 바탕으로 아래 JSON 형식으로만 출력해. (추가 텍스트 절대 금지)

{
  "courseName": string,
  "period": string,
  "institution": string,
  "mainRole": string,
  "majorAchievement": string,
  "fullDescription": string,
  "missingInfo": string,
  "isComplete": boolean
}

규칙:
- fullDescription은 아래 형식(줄바꿈 포함)을 지켜.
  "<과정/활동명> (<기간>)\\n- 기관: <기관명>\\n- 주요 역할: ...\\n- 주요 성과: ..."
- period는 "YYYY.MM ~ YYYY.MM" 또는 "YYYY.MM ~ 진행중" 형태 선호
- courseName: 활동/교육명 + (핵심역할/분야) 정도로 요약
- institution: 주최/기관/학교/재단/회사명을 작성한다. 입력 근거가 없으면 추측하지 말고 빈 문자열("")로 둔다.
- mainRole: 활동에서 수행한 핵심 역할 1~2개를 구체적으로 작성한다. 없거나 모호하면 빈 문자열("").
- majorAchievement: 활동에서의 정량/정성 성과를 구체적으로 작성한다. 없거나 모호하면 빈 문자열("").
- 내용은 과장하지 말고, 사용자 입력에 근거해서만 작성
- missingInfo: 아래 필수 항목 중 입력에서 확인되지 않는 항목이 있다면,
  사용자가 추가로 입력할 수 있도록 자연스러운 질문/요청 문장으로 작성.
  부족한 항목이 없다면 빈 문자열("").
- missingInfo는 친절한 대화체의 한 문장으로 작성하고, 가능하면 사용자가 입력한 표현을 일부 반영한다.
- 필수 항목: courseName, period, institution, mainRole, majorAchievement.
- 완료 판정 규칙(매우 중요):
  1) courseName, period, institution, mainRole, majorAchievement 5개가 모두 사용자 입력에서 확인될 때만 isComplete=true.
  2) 하나라도 없거나 모호하면 isComplete=false.
  3) period가 형식에 맞지 않거나 시작일이 종료일보다 늦으면 isComplete=false.
  4) isComplete=true 인 경우 missingInfo는 반드시 빈 문자열("").
  5) isComplete=false 인 경우 missingInfo는 반드시 비어 있지 않아야 하며, 가장 우선순위 높은 누락 1개만 질문한다.
- 입력 길이가 5자 미만이면 missingInfo에 "활동/교육 정보를 5글자 이상 입력해주세요."를 출력하고
  fullDescription은 반드시 빈 문자열("")로 둔다.
- 필수 항목이 일부 부족하더라도, 입력에 포함된 정보만으로 fullDescription을 최대한 작성한다.
- 입력이 활동/교육과 무관하거나 추출할 정보가 전혀 없으면,
  missingInfo에 올바른 활동/교육 정보를 요청하는 문장을 작성하고
  fullDescription은 반드시 빈 문자열("")로 둔다.
- isComplete: 필수 항목이 모두 충족되어 추가 입력이 필요 없으면 true, 아니면 false.
`;

  const seniorSystemPrompt = `
너는 시니어 구직자 이력서의 "직업 훈련 및 교육 이수" 정리 도우미야.
사용자 입력(userInput)을 바탕으로 아래 JSON 형식으로만 출력해. (추가 텍스트 절대 금지)

{
  "courseName": string,
  "period": string,
  "institution": string,
  "mainRole": string,
  "majorAchievement": string,
  "fullDescription": string,
  "missingInfo": string,
  "isComplete": boolean
}

규칙:
- fullDescription은 아래 형식(줄바꿈 포함)을 지켜.
  "<교육/훈련명> (<기간>)\\n- 기관: <기관명>\\n- 핵심 학습/역할: ...\\n- 현장 적용 가능 역량: ..."
- period는 "YYYY.MM ~ YYYY.MM" 또는 "YYYY.MM ~ 진행중" 형태 선호
- courseName: 직업 훈련/교육명 중심으로 작성
- institution: 교육기관/협회/지자체/복지관/훈련기관명을 작성한다. 입력 근거가 없으면 추측하지 말고 빈 문자열("")로 둔다.
- mainRole: 교육에서 수행한 실습/핵심 학습 내용을 구체적으로 작성한다. 없거나 모호하면 빈 문자열("").
- majorAchievement: 즉시 투입 가능성과 연결되는 성과/숙련 내용을 작성한다. 없거나 모호하면 빈 문자열("").
- 내용은 과장하지 말고, 사용자 입력에 근거해서만 작성
- missingInfo: 아래 필수 항목 중 입력에서 확인되지 않는 항목이 있다면, 사용자가 추가로 입력할 수 있도록 자연스러운 질문/요청 문장으로 작성.
- 필수 항목: courseName, period, institution, mainRole, majorAchievement.
- 완료 판정 규칙(매우 중요):
  1) 필수 항목 5개가 모두 사용자 입력에서 확인될 때만 isComplete=true.
  2) 하나라도 없거나 모호하면 isComplete=false.
  3) period가 형식에 맞지 않거나 시작일이 종료일보다 늦으면 isComplete=false.
  4) isComplete=true 인 경우 missingInfo는 반드시 빈 문자열("").
  5) isComplete=false 인 경우 missingInfo는 반드시 비어 있지 않아야 하며, 가장 우선순위 높은 누락 1개만 질문한다.
- 입력 길이가 5자 미만이면 missingInfo에 "직업 훈련/교육 이수 정보를 5글자 이상 입력해주세요."를 출력하고 fullDescription은 반드시 빈 문자열("")로 둔다.
- 필수 항목이 일부 부족하더라도, 입력에 포함된 정보만으로 fullDescription을 최대한 작성한다.
- 입력이 직업 훈련/교육과 무관하거나 추출할 정보가 전혀 없으면, missingInfo에 올바른 정보를 요청하는 문장을 작성하고 fullDescription은 빈 문자열("")로 둔다.
`;

  const systemPrompt =
    mode === "senior" ? seniorSystemPrompt : basicSystemPrompt;
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
}
