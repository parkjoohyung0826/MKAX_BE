import { genAI, GEMINI_MODEL } from "../common/gemini";
import { CoverLetterSection } from "../common/coverLetter.types";

type DraftRequest = {
  section: CoverLetterSection;
  userInput: string;
  desiredJob?: string;
};

export class CoverLetterService {
  static async generateDraft({ section, userInput, desiredJob }: DraftRequest) {
    const trimmedInput = userInput.trim();
    if (trimmedInput.length < 5) {
      return {
        fullDescription: "",
        section,
        missingInfo: "자기소개서 내용을 5글자 이상 입력해주세요.",
        isComplete: false,
      };
    }

    const prompt = buildPrompt(section, userInput, desiredJob);

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);

    const text = result?.response?.text?.() ?? "";
    const fullDescription = text.trim();

    return {
      fullDescription,
      section,
      missingInfo: fullDescription.length === 0 ? "올바른 내용을 입력해주세요." : "",
      isComplete: fullDescription.length > 0,
    };
  }
}

function buildPrompt(
  section: CoverLetterSection,
  userInput: string,
  desiredJob?: string
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
