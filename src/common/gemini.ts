import { GoogleGenerativeAI } from "@google/generative-ai";
import { recordGeminiUsageMetric } from "./requestMetrics";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY in environment variables.");
}

const rawGenAI = new GoogleGenerativeAI(apiKey);

function wrapGenerativeModel<T extends object>(model: T, modelName?: string): T {
  return new Proxy(model, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      if (prop !== "generateContent" || typeof original !== "function") {
        return original;
      }

      return async (...args: unknown[]) => {
        const startedAt = Date.now();
        const result = await original.apply(target, args);
        const durationMs = Date.now() - startedAt;
        const usage =
          (result as { response?: { usageMetadata?: unknown } })?.response
            ?.usageMetadata ??
          (result as { usageMetadata?: unknown })?.usageMetadata;

        recordGeminiUsageMetric({
          model: modelName,
          durationMs,
          usage:
            usage && typeof usage === "object"
              ? (usage as {
                  promptTokenCount?: number;
                  candidatesTokenCount?: number;
                  totalTokenCount?: number;
                })
              : undefined,
        });

        return result;
      };
    },
  });
}

const originalGetGenerativeModel = rawGenAI.getGenerativeModel.bind(
  rawGenAI
) as (...args: any[]) => any;

(rawGenAI as GoogleGenerativeAI & {
  getGenerativeModel: (...args: any[]) => any;
}).getGenerativeModel = (...args: any[]) => {
  const model = originalGetGenerativeModel(...args);
  const modelName =
    args[0] && typeof args[0] === "object" ? (args[0] as any).model : undefined;
  return wrapGenerativeModel(model, modelName);
};

export const genAI = rawGenAI;

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
