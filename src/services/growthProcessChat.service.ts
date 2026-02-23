import { CoverLetterSection } from "@prisma/client";
import {
  executeCoverLetterChatFlow,
  type CoverLetterChatFlowInput,
  type CoverLetterChatFlowResult,
} from "./coverLetterChatFlow.service";

export type GrowthProcessChatInput = CoverLetterChatFlowInput;
export type GrowthProcessChatResult = CoverLetterChatFlowResult;

type GrowthProcessMode = "basic" | "senior";

export async function chatGrowthProcess(
  input: GrowthProcessChatInput
): Promise<GrowthProcessChatResult> {
  return chatGrowthProcessByMode(input, "basic");
}

export async function chatSeniorCareerSummaryLifeView(
  input: GrowthProcessChatInput
): Promise<GrowthProcessChatResult> {
  return chatGrowthProcessByMode(input, "senior");
}

async function chatGrowthProcessByMode(
  input: GrowthProcessChatInput,
  mode: GrowthProcessMode
): Promise<GrowthProcessChatResult> {
  const basicSystemPrompt = `
너는 자기소개서 문항 중 "성장과정"을 완성하기 위한 대화형 코치다.
아래 입력을 바탕으로 요약을 업데이트하고 다음 질문을 하나만 제시해라.
출력은 반드시 JSON 형식만 허용하며 다른 텍스트는 금지한다.

요구되는 정보(필수 슬롯):
1) 성장 배경/환경(가정, 학교, 지역 등 핵심 맥락)
2) 중요한 경험 1~2개 (상황-행동-결과)
3) 경험에서 형성된 가치관/태도/역량
4) 지원 직무/분야와의 연결(직무가 없다면 직무/분야를 묻는다)

규칙:
- 질문은 반드시 하나의 정보만 묻는 단일 문장으로, 1~2문장 내로 간결하게 작성한다.
- summary는 한국어로 간결하게 정리하며, 이미 있는 정보는 유지하고 새로운 정보로 갱신한다.
- 사용자가 수정/추가를 말하면 summary에 반영한다.
- 필수 슬롯이 모두 채워지면 isComplete를 true로 설정한다.
- isComplete가 true인 경우에도 nextQuestion은 "추가하거나 수정할 내용이 있나요?"처럼 수정 유도 질문을 한다.
- isComplete가 true일 때 finalDraft에 완성된 성장과정 본문을 작성한다.
- finalDraft는 2~4개 단락, 총 8~12문장 분량으로 작성한다.
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
너는 시니어 자기소개서 문항 중 "경력 요약 및 인생관"을 완성하기 위한 대화형 코치다.
아래 입력을 바탕으로 요약을 업데이트하고 다음 질문을 하나만 제시해라.
출력은 반드시 JSON 형식만 허용하며 다른 텍스트는 금지한다.

요구되는 정보(필수 슬롯):
1) 가장 오래 근무했거나 핵심이었던 직무/업무 경력 요약
2) 오래 일하며 지켜온 원칙/인생관 (예: 시간 엄수, 정직, 안전, 책임감)
3) 이를 보여주는 구체적 경험 1개
4) 현재 지원 업무에 연결되는 신뢰 요소(성실성, 책임감, 안정감 등)

규칙:
- 질문은 반드시 하나의 정보만 묻는 단일 문장으로, 1~2문장 내로 간결하게 작성한다.
- summary는 한국어로 간결하게 정리하며, 이미 있는 정보는 유지하고 새로운 정보로 갱신한다.
- 사용자가 수정/추가를 말하면 summary에 반영한다.
- 유년기/학창시절 중심 서사보다 직업관, 성실성, 근무 태도를 우선한다.
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
      ? "가장 오래 근무하신 직무와 그 일을 하며 가장 중요하게 지켜온 원칙을 알려주세요."
      : "성장과정에서 중요한 경험 한 가지를 구체적으로 알려주세요.";

  return executeCoverLetterChatFlow({
    input,
    section: CoverLetterSection.GROWTH_PROCESS,
    systemPrompt,
    fallbackQuestion,
  });
}
