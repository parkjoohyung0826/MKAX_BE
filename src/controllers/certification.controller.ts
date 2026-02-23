import { z } from "zod";
import {
  recommendCertificationFromInput,
  recommendSeniorLicenseSkillFromInput,
} from "../services/certification.service";
import { RecommendSection } from "@prisma/client";
import {
  createRecommendAccumulatedController,
} from "../common/controllerHelpers";

const RecommendCertificationSchema = z.object({
  userInput: z.string(),
});

export const recommendCertificationController = createRecommendAccumulatedController({
  schema: RecommendCertificationSchema,
  section: RecommendSection.CERTIFICATION,
  getInput: (data) => data.userInput,
  service: recommendCertificationFromInput,
  getIsComplete: (result) => result.isComplete,
  fallbackError: {
    logLabel: "[recommendCertificationController]",
    message: "Failed to recommend certification",
  },
});

export const recommendSeniorLicenseSkillController =
  createRecommendAccumulatedController({
    schema: RecommendCertificationSchema,
    section: RecommendSection.CERTIFICATION,
    getInput: (data) => data.userInput,
    service: recommendSeniorLicenseSkillFromInput,
    getIsComplete: (result) => result.isComplete,
    fallbackError: {
      logLabel: "[POST /api/recommend/senior-license-skill]",
      message: "Failed to recommend senior license skill",
    },
  });
