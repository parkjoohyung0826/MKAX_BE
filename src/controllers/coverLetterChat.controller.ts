import { resetChatSession } from "../repositories/coverLetterChat.repository";
import { z } from "zod";
import { CoverLetterSection } from "@prisma/client";
import { createSessionResetController } from "../common/controllerHelpers";

const ResetSchema = z.object({
  section: z.nativeEnum(CoverLetterSection).optional(),
});

export const resetCoverLetterChatController = createSessionResetController(
  ResetSchema,
  resetChatSession,
  (data) => data.section,
  "resetCoverLetterChatController"
);
