import { CoverLetterSection } from "@prisma/client";
import {
  executeCoverLetterChatFlow,
  type CoverLetterChatFlowInput,
  type CoverLetterChatFlowResult,
} from "./coverLetterChatFlow.service";

type ChatFlowConfig = {
  section: CoverLetterSection;
  basicSystemPrompt: string;
  seniorSystemPrompt: string;
  basicFallbackQuestion: string;
  seniorFallbackQuestion: string;
};

export function createChatFlowService(config: ChatFlowConfig): {
  basicFn: (input: CoverLetterChatFlowInput) => Promise<CoverLetterChatFlowResult>;
  seniorFn: (input: CoverLetterChatFlowInput) => Promise<CoverLetterChatFlowResult>;
} {
  const byMode = (input: CoverLetterChatFlowInput, mode: "basic" | "senior") => {
    const systemPrompt =
      mode === "senior" ? config.seniorSystemPrompt : config.basicSystemPrompt;
    const fallbackQuestion =
      mode === "senior" ? config.seniorFallbackQuestion : config.basicFallbackQuestion;
    return executeCoverLetterChatFlow({
      input,
      section: config.section,
      systemPrompt,
      fallbackQuestion,
    });
  };

  return {
    basicFn: (input) => byMode(input, "basic"),
    seniorFn: (input) => byMode(input, "senior"),
  };
}
