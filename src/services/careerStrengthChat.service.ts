import { CoverLetterSection } from "@prisma/client";
import {
  executeCoverLetterChatFlow,
  type CoverLetterChatFlowInput,
  type CoverLetterChatFlowResult,
} from "./coverLetterChatFlow.service";

export type CareerStrengthChatInput = CoverLetterChatFlowInput;
export type CareerStrengthChatResult = CoverLetterChatFlowResult;

type CareerStrengthMode = "basic" | "senior";

export async function chatCareerStrength(
  input: CareerStrengthChatInput
): Promise<CareerStrengthChatResult> {
  return chatCareerStrengthByMode(input, "basic");
}

export async function chatSeniorCoreSkills(
  input: CareerStrengthChatInput
): Promise<CareerStrengthChatResult> {
  return chatCareerStrengthByMode(input, "senior");
}

async function chatCareerStrengthByMode(
  input: CareerStrengthChatInput,
  mode: CareerStrengthMode
): Promise<CareerStrengthChatResult> {
  const basicSystemPrompt = `
너는 자기소개서 문항 중 "주요 경력 및 업무 경험"을 완성하기 위한 대화형 코치다.
아래 입력을 바탕으로 요약을 업데이트하고 다음 질문을 하나만 제시해라.
출력은 반드시 JSON 형식만 허용하며 다른 텍스트는 금지한다.

요구되는 정보(필수 슬롯):
1) 경험/프로젝트 1~2개
2) 각 경험의 역할/기여/성과(가능하면 수치/지표)
3) 드러난 업무 강점(문제해결, 리딩, 협업 등)
4) 지원 직무/업무와의 연결

규칙:
- 질문은 반드시 하나의 정보만 묻는 단일 문장으로, 1~2문장 내로 간결하게 작성한다.
- summary는 한국어로 간결하게 정리하며, 이미 있는 정보는 유지하고 새로운 정보로 갱신한다.
- 사용자가 수정/추가를 말하면 summary에 반영한다.
- 필수 슬롯이 모두 채워지면 isComplete를 true로 설정한다.
- isComplete가 true인 경우에도 nextQuestion은 "추가하거나 수정할 내용이 있나요?"처럼 수정 유도 질문을 한다.
- isComplete가 true일 때 finalDraft에 완성된 본문을 작성한다.
- finalDraft는 2~4개 단락, 총 9~13문장 분량으로 작성한다.
- finalDraft는 제목/머리말/불릿 없이 본문만 출력한다.

반환 JSON 형식:
{
  "nextQuestion": string,
  "summary": string,
  "finalDraft": string,
  "isComplete": boolean
}
`;

  const seniorSystemPrompt = `
너는 시니어 자기소개서 문항 중 "핵심 역량 및 보유 기술"을 완성하기 위한 대화형 코치다.
아래 입력을 바탕으로 요약을 업데이트하고 다음 질문을 하나만 제시해라.
출력은 반드시 JSON 형식만 허용하며 다른 텍스트는 금지한다.

요구되는 정보(필수 슬롯):
1) 지원 업무에 바로 활용 가능한 자격증/기술/실무 능력
2) 과거 경력에서 전이 가능한 역량(기록관리, 고객응대, 안전의식, 책임감 등)
3) 이를 보여주는 구체적 경험 또는 업무 사례 1~2개
4) 지원 직무에 어떻게 즉시 기여 가능한지 연결

규칙:
- 질문은 반드시 하나의 정보만 묻는 단일 문장으로, 1~2문장 내로 간결하게 작성한다.
- summary는 한국어로 간결하게 정리하며, 이미 있는 정보는 유지하고 새로운 정보로 갱신한다.
- 사용자가 수정/추가를 말하면 summary에 반영한다.
- 단순 경력 나열보다 "지원 업무에 쓸 수 있는 기술/습관/노하우"를 강조한다.
- 직종 전환인 경우에도 전이 가능한 역량 연결을 우선한다.
- 필수 슬롯이 모두 채워지면 isComplete를 true로 설정한다.
- isComplete가 true인 경우에도 nextQuestion은 "추가하거나 수정할 내용이 있나요?"처럼 수정 유도 질문을 한다.
- isComplete가 true일 때 finalDraft에 완성된 본문을 작성한다.
- finalDraft는 2~3개 단락, 총 8~11문장 분량으로 작성한다.
- finalDraft는 제목/머리말/불릿 없이 본문만 출력한다.

반환 JSON 형식:
{
  "nextQuestion": string,
  "summary": string,
  "finalDraft": string,
  "isComplete": boolean
}
`;

  const systemPrompt = mode === "senior" ? seniorSystemPrompt : basicSystemPrompt;
  const fallbackQuestion =
    mode === "senior"
      ? "지원 업무에 바로 활용할 수 있는 기술이나 자격증, 또는 이전 일에서 가져올 수 있는 노하우를 알려주세요."
      : "주요 경력 또는 프로젝트 한 가지를 구체적으로 알려주세요.";

  return executeCoverLetterChatFlow({
    input,
    section: CoverLetterSection.CAREER_STRENGTH,
    systemPrompt,
    fallbackQuestion,
  });
}
