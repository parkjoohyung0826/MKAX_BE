import { Request, Response } from "express";
import { z } from "zod";
import { CoverLetterService } from "../services/coverLetter.service";
import { CoverLetterSection } from "../common/coverLetter.types";
import { withControllerErrorHandling } from "../common/controllerHelpers";
import { buildDynamicQuestionPrompts } from "../services/customQuestionPrompt.service";
import { createCustomCoverLetterSet, resetCustomChatState } from "../repositories/customCoverLetter.repository";
import { chatCustomCoverLetterQuestion } from "../services/customCoverLetterChat.service";

const allowedSections = [
  "GROWTH_PROCESS",
  "PERSONALITY",
  "CAREER_STRENGTH",
  "MOTIVATION_ASPIRATION",
] as const satisfies ReadonlyArray<CoverLetterSection>;

const CreateDraftSchema = z.object({
  section: z.enum(allowedSections, {
    error: "section 값이 올바르지 않습니다.",
  }),
  userInput: z
    .string()
    .trim()
    .min(1, { error: "userInput은 필수입니다." }),
  desiredJob: z.string().optional(),
  mode: z.enum(["basic", "senior"]).optional(),
});

const DynamicQuestionSchema = z
  .object({
    questionTitle: z
      .string()
      .trim()
      .min(1, { error: "questionTitle은 필수입니다." }),
    hasCharacterLimit: z.boolean().optional().default(false),
    characterLimit: z.number().int().positive().max(5000).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (
      value.hasCharacterLimit &&
      (typeof value.characterLimit !== "number" || value.characterLimit <= 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["characterLimit"],
        message: "hasCharacterLimit이 true일 때 characterLimit은 1 이상의 숫자여야 합니다.",
      });
    }
  });

const CreateDynamicPromptsSchema = z.object({
  questions: z
    .array(DynamicQuestionSchema)
    .min(1, { error: "questions는 1개 이상이어야 합니다." })
    .max(20, { error: "questions는 최대 20개까지 가능합니다." }),
});

const CreateCustomSetSchema = z.object({
  companyName: z.string().trim().max(100).optional(),
  questions: z
    .array(
      z
        .object({
          title: z.string().trim().min(1, { error: "title은 필수입니다." }),
          hasCharacterLimit: z.boolean().optional().default(false),
          characterLimit: z.number().int().positive().max(5000).optional().nullable(),
        })
        .superRefine((value, ctx) => {
          if (
            value.hasCharacterLimit &&
            (typeof value.characterLimit !== "number" || value.characterLimit <= 0)
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["characterLimit"],
              message: "hasCharacterLimit이 true일 때 characterLimit은 1 이상의 숫자여야 합니다.",
            });
          }
        })
    )
    .min(1, { error: "questions는 1개 이상이어야 합니다." })
    .max(20, { error: "questions는 최대 20개까지 가능합니다." }),
});

const CustomChatParamsSchema = z.object({
  questionId: z.coerce.number().int().positive(),
});

const CustomChatBodySchema = z.object({
  userInput: z.string().trim().min(1, { error: "userInput은 필수입니다." }),
  currentSummary: z.string().optional(),
});

const ResetCustomChatSchema = z.object({
  questionId: z.number().int().positive().optional(),
  setId: z.number().int().positive().optional(),
});

export class CoverLetterController {
  static createDraft = withControllerErrorHandling(
    async (req: Request, res: Response) => {
      const parsed = CreateDraftSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        const field = firstIssue?.path?.[0];
        const message =
          field === "section"
            ? "section 값이 올바르지 않습니다."
            : field === "userInput"
            ? "userInput은 필수입니다."
            : "Invalid request body";
        return res.status(400).json({
          message,
          errors: parsed.error.flatten(),
        });
      }

      const bodyData = parsed.data;

      const result = await CoverLetterService.generateDraft({
        section: bodyData.section,
        userInput: bodyData.userInput,
        desiredJob: bodyData.desiredJob,
        mode: bodyData.mode,
      });

      return res.status(200).json(result);
    },
    "CoverLetterController.createDraft"
  );

  static createDynamicQuestionPrompts = withControllerErrorHandling(
    async (req: Request, res: Response) => {
      const parsed = CreateDynamicPromptsSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parsed.error.flatten(),
        });
      }

      const prompts = await buildDynamicQuestionPrompts(parsed.data.questions);

      return res.status(200).json({
        prompts,
      });
    },
    "CoverLetterController.createDynamicQuestionPrompts"
  );

  static createCustomSet = withControllerErrorHandling(
    async (req: Request, res: Response) => {
      const parsed = CreateCustomSetSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parsed.error.flatten(),
        });
      }

      const sessionId = req.sessionId;
      if (!sessionId) {
        return res.status(400).json({ message: "sessionId가 필요합니다." });
      }

      const prompts = await buildDynamicQuestionPrompts(
        parsed.data.questions.map((question) => ({
          questionTitle: question.title,
          hasCharacterLimit: Boolean(question.hasCharacterLimit),
          characterLimit: question.characterLimit,
        }))
      );

      const created = await createCustomCoverLetterSet({
        sessionId,
        companyName: parsed.data.companyName,
        questions: prompts.map((prompt, index) => ({
          order: index,
          title: prompt.questionTitle,
          hasCharacterLimit: prompt.hasCharacterLimit,
          characterLimit: prompt.characterLimit,
          systemPrompt: prompt.systemPrompt,
        })),
      });

      return res.status(201).json({
        setId: created.id,
        companyName: created.companyName,
        questions: created.questions.map((question) => ({
          questionId: question.id,
          order: question.order,
          title: question.title,
          hasCharacterLimit: question.hasCharacterLimit,
          characterLimit: question.characterLimit,
          systemPrompt: question.systemPrompt,
        })),
      });
    },
    "CoverLetterController.createCustomSet"
  );

  static chatCustomQuestion = withControllerErrorHandling(
    async (req: Request, res: Response) => {
      const parsedParams = CustomChatParamsSchema.safeParse(req.params ?? {});
      if (!parsedParams.success) {
        return res.status(400).json({
          message: "questionId 값이 올바르지 않습니다.",
          errors: parsedParams.error.flatten(),
        });
      }

      const parsedBody = CustomChatBodySchema.safeParse(req.body ?? {});
      if (!parsedBody.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parsedBody.error.flatten(),
        });
      }

      const sessionId = req.sessionId;
      if (!sessionId) {
        return res.status(400).json({ message: "sessionId가 필요합니다." });
      }

      const result = await chatCustomCoverLetterQuestion({
        sessionId,
        questionId: parsedParams.data.questionId,
        userInput: parsedBody.data.userInput,
        currentSummary: parsedBody.data.currentSummary,
      });

      return res.status(200).json(result);
    },
    "CoverLetterController.chatCustomQuestion"
  );

  static resetCustomChat = withControllerErrorHandling(
    async (req: Request, res: Response) => {
      const parsed = ResetCustomChatSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parsed.error.flatten(),
        });
      }

      const sessionId = req.sessionId;
      if (!sessionId) {
        return res.status(400).json({ message: "sessionId가 필요합니다." });
      }

      await resetCustomChatState(sessionId, {
        questionId: parsed.data.questionId,
        setId: parsed.data.setId,
      });

      return res.status(200).json({ message: "custom chat reset" });
    },
    "CoverLetterController.resetCustomChat"
  );
}
