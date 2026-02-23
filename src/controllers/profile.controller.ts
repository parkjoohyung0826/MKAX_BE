import { z } from "zod";
import { recommendProfileFromDescription } from "../services/profile.service";
import { RecommendSection } from "@prisma/client";
import {
  createRecommendAccumulatedController,
} from "../common/controllerHelpers";

const ProfileSchema = z.object({
  description: z.string(),
});

export const recommendProfileController = createRecommendAccumulatedController({
  schema: ProfileSchema,
  section: RecommendSection.PROFILE,
  getInput: (data) => data.description,
  service: recommendProfileFromDescription,
  getIsComplete: () => false,
  errorTag: "recommendProfileController",
});
