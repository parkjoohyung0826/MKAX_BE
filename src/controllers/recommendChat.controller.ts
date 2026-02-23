import { z } from "zod";
import { RecommendSection } from "@prisma/client";
import { resetRecommendSession } from "../repositories/recommendChat.repository";
import { createSessionResetController } from "../common/controllerHelpers";

const ResetSchema = z.object({
  section: z.nativeEnum(RecommendSection).optional(),
});

export const resetRecommendChatController = createSessionResetController(
  ResetSchema,
  resetRecommendSession,
  (data) => data.section,
  "resetRecommendChatController"
);
