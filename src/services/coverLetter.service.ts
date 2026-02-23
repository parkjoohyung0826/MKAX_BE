import { genAI, GEMINI_MODEL } from "../common/gemini";
import { CoverLetterSection } from "../common/coverLetter.types";

type DraftRequest = {
  section: CoverLetterSection;
  userInput: string;
  desiredJob?: string;
  mode?: "basic" | "senior";
};

export class CoverLetterService {
  static async generateDraft({
    section,
    userInput,
    desiredJob,
    mode = "basic",
  }: DraftRequest) {
    const trimmedInput = userInput.trim();
    if (trimmedInput.length < 5) {
      return {
        fullDescription: "",
        section,
        mode,
        missingInfo: "자기소개서 내용을 5글자 이상 입력해주세요.",
        isComplete: false,
      };
    }
    if (!isLikelyMeaningful(trimmedInput)) {
      return {
        fullDescription: "",
        section,
        mode,
        missingInfo: "올바른 내용을 입력해주세요.",
        isComplete: false,
      };
    }
    const relevance = await evaluateSectionRelevance(
      section,
      trimmedInput,
      desiredJob,
      mode
    );
    if (!relevance.isRelevant) {
      return {
        fullDescription: "",
        section,
        mode,
        missingInfo:
          relevance.missingInfo || "문항에 맞는 내용을 입력해주세요.",
        isComplete: false,
      };
    }

    const prompt = buildPrompt(section, userInput, desiredJob, mode);

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);

    const text = result?.response?.text?.() ?? "";
    const fullDescription = text.trim();

    return {
      fullDescription,
      section,
      mode,
      missingInfo: fullDescription.length === 0 ? "올바른 내용을 입력해주세요." : "",
      isComplete: fullDescription.length > 0,
    };
  }
}

function isLikelyMeaningful(value: string) {
  const cleaned = value.replace(/\s+/g, "");
  const meaningfulChars = cleaned.match(/[A-Za-z0-9가-힣]/g) ?? [];
  if (meaningfulChars.length < 5) return false;
  if (meaningfulChars.length / cleaned.length < 0.5) return false;
  const uniqueChars = new Set(meaningfulChars).size;
  if (uniqueChars < Math.min(3, meaningfulChars.length)) return false;
  return true;
}

async function evaluateSectionRelevance(
  section: CoverLetterSection,
  userInput: string,
  desiredJob?: string,
  mode: "basic" | "senior" = "basic"
): Promise<{ isRelevant: boolean; missingInfo: string }> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const jobLine = desiredJob ? `지원 직무: ${desiredJob}` : "지원 직무: 미상";
  const systemPrompt = `
너는 자기소개서 문항 적합성을 판단하는 검사자다.
아래 입력이 해당 문항의 주제와 관련 있는지 판단해 JSON으로만 출력한다.

출력 형식:
{
  "isRelevant": boolean,
  "missingInfo": string
}

규칙:
- 내용이 문항 주제와 명확히 관련되면 true.
- 무관한 일상/잡담/의미 없는 텍스트이면 false.
- 판단이 애매하면 false.
- isRelevant가 false일 때 missingInfo는 구체적으로 어떤 내용을 추가해야 하는지 안내하는 한 문장으로 작성한다.
- isRelevant가 true일 때 missingInfo는 빈 문자열("").
`;
  const userPrompt = `
문항: ${section}
모드: ${mode}
${jobLine}
사용자 입력:
"""${userInput}"""
`.trim();

  try {
    const result = await model.generateContent([systemPrompt, userPrompt]);
    const text = result?.response?.text?.() ?? "";
    const cleaned = text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    return {
      isRelevant: Boolean(parsed?.isRelevant),
      missingInfo: String(parsed?.missingInfo ?? ""),
    };
  } catch {
    return { isRelevant: true, missingInfo: "" };
  }
}

function buildPrompt(
  section: CoverLetterSection,
  userInput: string,
  desiredJob?: string,
  mode: "basic" | "senior" = "basic"
) {
  const jobLine = desiredJob ? `- 지원 직무: ${desiredJob}\n` : "";

  const common = `
너는 채용용 자기소개서를 코칭하는 전문가다.
아래 사용자 입력을 바탕으로 지정된 문항의 "초안"을 한국어로 작성해라.

공통 요구사항:
- 과장/허위 금지, 구체적으로(상황-행동-결과/배운점)
- 너무 감성적 표현/시적 표현은 피하고, 현실적이고 깔끔한 문장
- 2~4개 단락으로 자연스럽게 줄바꿈
- 출력은 '본문만' (제목/머리말/불릿/라벨 금지)
${jobLine}
사용자 입력:
"""${userInput}"""
`.trim();

  if (mode === "senior") {
    switch (section) {
      case "GROWTH_PROCESS":
        return `
${common}

문항: 경력 요약 및 인생관 (시니어)
포인트:
- 가장 오래 근무했거나 핵심이었던 직무/업무 경력 요약
- 오래 일하며 지켜온 원칙/인생관(시간 엄수, 정직, 안전, 책임감 등)
- 이를 보여주는 구체적 사례 1개
- 현재 지원 업무에 연결되는 신뢰 요소(성실성/책임감/안정감)
분량: 7~10문장 내
`.trim();

      case "PERSONALITY":
        return `
${common}

문항: 조직 융화력 및 소통 태도 (시니어)
포인트:
- 젊은 동료/상사와의 소통 태도(경청, 존중, 협업) 강조
- 조직 융화 또는 갈등 완화 사례 1개
- 동료 배려/책임감/팀 기여 방식
- 단점 중심 서술은 피하고 협업 안정감 중심으로 작성
분량: 7~10문장 내
`.trim();

      case "CAREER_STRENGTH":
        return `
${common}

문항: 핵심 역량 및 보유 기술 (시니어)
포인트:
- 지원 업무에 바로 활용 가능한 자격증/기술/실무 능력
- 과거 경력에서 전이 가능한 역량(고객응대, 기록관리, 안전의식, 책임감 등)
- 구체적 사례 1~2개로 즉시 투입 가능성 강조
- 직종 전환이라도 새 업무에 도움이 되는 노하우 연결
분량: 8~11문장 내
`.trim();

      case "MOTIVATION_ASPIRATION":
        return `
${common}

문항: 지원 동기 및 근무 각오 (건강/성실) (시니어)
포인트:
- 왜 이 업무를 지원하는지 (현실적이고 구체적인 이유)
- 성실 근무 의지/근태/책임감 근거
- 건강 관리 습관 또는 현장 근무 가능 체력
- 새로운 업무 방식/기계/스마트폰 등 디지털 적응 태도
분량: 7~10문장 내
`.trim();

      default:
        return common;
    }
  }

  switch (section) {
    case "GROWTH_PROCESS":
      return `
${common}

문항: 성장과정
포인트:
- 직무 관심 계기/가치관 형성/중요한 경험 1~2개
- 어떤 태도/역량이 형성되었는지
- 마지막 문단에서 지원 직무에 어떻게 연결되는지
분량: 8~12문장 내
`.trim();

    case "PERSONALITY":
      return `
${common}

문항: 성격의 장단점
포인트:
- 장점 1~2개: 실제 사례로 증명(협업, 실행력, 커뮤니케이션 등)
- 단점 1개: 인식 + 개선 행동 + 현재 변화(부정적으로 끝나지 않게)
- 단점은 치명적 결함처럼 보이지 않게, 개선 노력 강조
분량: 8~12문장 내
`.trim();

    case "CAREER_STRENGTH":
      return `
${common}

문항: 주요 경력 및 업무 강점
포인트:
- 경험/프로젝트 1~2개를 중심으로 역할/기여/성과를 구체적으로
- 본인의 강점(문제해결, 리딩, 품질개선, 속도, 협업 등)을 근거로 제시
- 가능하면 수치/지표/결과(기간 단축, 비용 절감, 사용자 증가 등) 포함
분량: 9~13문장 내
`.trim();

    case "MOTIVATION_ASPIRATION":
      return `
${common}

문항: 지원 동기 및 포부
포인트:
- 왜 이 직무/분야인지 (개인 경험 기반)
- 내가 가진 역량이 회사/팀에 어떻게 기여하는지
- 입사 후 6개월~1년 내 목표(현실적) + 장기 포부(성장 방향)
분량: 8~12문장 내
`.trim();

    default:
      return common;
  }
}
