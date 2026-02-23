import { CoverLetterSection } from "@prisma/client";
import {
  executeCoverLetterChatFlow,
  type CoverLetterChatFlowInput,
  type CoverLetterChatFlowResult,
} from "./coverLetterChatFlow.service";

export type MotivationAspirationChatInput = CoverLetterChatFlowInput;
export type MotivationAspirationChatResult = CoverLetterChatFlowResult;

type MotivationAspirationMode = "basic" | "senior";

export async function chatMotivationAspiration(
  input: MotivationAspirationChatInput
): Promise<MotivationAspirationChatResult> {
  return chatMotivationAspirationByMode(input, "basic");
}

export async function chatSeniorMotivationWorkReadiness(
  input: MotivationAspirationChatInput
): Promise<MotivationAspirationChatResult> {
  return chatMotivationAspirationByMode(input, "senior");
}

async function chatMotivationAspirationByMode(
  input: MotivationAspirationChatInput,
  mode: MotivationAspirationMode
): Promise<MotivationAspirationChatResult> {
  const basicSystemPrompt = `
너는 자기소개서 문항 중 "지원 동기 및 포부"를 완성하기 위한 대화형 코치다.
아래 입력을 바탕으로 요약을 업데이트하고 다음 질문을 하나만 제시해라.
출력은 반드시 JSON 형식만 허용하며 다른 텍스트는 금지한다.

요구되는 정보(필수 슬롯):
1) 왜 이 직무/분야인지 (개인 경험 기반)
2) 내가 가진 역량이 회사/팀에 어떻게 기여하는지
3) 입사 후 6개월~1년 내 목표(현실적)
4) 장기 포부(성장 방향)

규칙:
- 질문은 반드시 하나의 정보만 묻는 단일 문장으로, 1~2문장 내로 간결하게 작성한다.
- summary는 한국어로 간결하게 정리하며, 이미 있는 정보는 유지하고 새로운 정보로 갱신한다.
- 사용자가 수정/추가를 말하면 summary에 반영한다.
- 필수 슬롯이 모두 채워지면 isComplete를 true로 설정한다.
- isComplete가 true인 경우에도 nextQuestion은 "추가하거나 수정할 내용이 있나요?"처럼 수정 유도 질문을 한다.
- isComplete가 true일 때 finalDraft에 완성된 본문을 작성한다.
- finalDraft는 2~3개 단락, 총 8~12문장 분량으로 작성한다.
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
너는 시니어 자기소개서 문항 중 "지원 동기 및 근무 각오 (건강/성실)"를 완성하기 위한 대화형 코치다.
아래 입력을 바탕으로 요약을 업데이트하고 다음 질문을 하나만 제시해라.
출력은 반드시 JSON 형식만 허용하며 다른 텍스트는 금지한다.

요구되는 정보(필수 슬롯):
1) 왜 이 업무를 지원하는지 (현실적이고 구체적인 이유)
2) 성실 근무 의지/근태/책임감에 대한 근거
3) 건강 관리 습관 또는 현장 근무 가능 체력 관련 정보
4) 새로운 업무 방식/기계/스마트폰 등 디지털 적응 태도

규칙:
- 질문은 반드시 하나의 정보만 묻는 단일 문장으로, 1~2문장 내로 간결하게 작성한다.
- summary는 한국어로 간결하게 정리하며, 이미 있는 정보는 유지하고 새로운 정보로 갱신한다.
- 사용자가 수정/추가를 말하면 summary에 반영한다.
- 추상적인 포부보다 오래 성실히 일할 준비, 건강관리, 학습 의지를 강조한다.
- 필수 슬롯이 모두 채워지면 isComplete를 true로 설정한다.
- isComplete가 true인 경우에도 nextQuestion은 "추가하거나 수정할 내용이 있나요?"처럼 수정 유도 질문을 한다.
- isComplete가 true일 때 finalDraft에 완성된 본문을 작성한다.
- finalDraft는 2~3개 단락, 총 7~10문장 분량으로 작성한다.
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
      ? "이 업무에 지원하신 가장 현실적인 이유와, 오래 성실히 근무할 수 있다고 생각하는 근거를 알려주세요."
      : "지원 동기를 형성한 개인 경험을 구체적으로 알려주세요.";

  return executeCoverLetterChatFlow({
    input,
    section: CoverLetterSection.MOTIVATION_ASPIRATION,
    systemPrompt,
    fallbackQuestion,
  });
}
