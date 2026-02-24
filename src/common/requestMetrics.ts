import { AsyncLocalStorage } from "async_hooks";

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

type GeminiCallMetric = {
  model?: string;
  durationMs: number;
  usage: GeminiUsageMetadata;
};

export type RequestMetricStore = {
  requestStartAt: number;
  method: string;
  path: string;
  sessionId?: string;
  geminiCalls: GeminiCallMetric[];
};

const requestMetricsStorage = new AsyncLocalStorage<RequestMetricStore>();

function parseNumberEnv(name: string, defaultValue?: number): number | undefined {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return defaultValue;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export function runWithRequestMetrics<T>(
  store: RequestMetricStore,
  callback: () => T
) {
  return requestMetricsStorage.run(store, callback);
}

export function getRequestMetricStore() {
  return requestMetricsStorage.getStore();
}

export function setRequestMetricSessionId(sessionId?: string) {
  const store = requestMetricsStorage.getStore();
  if (store && sessionId) {
    store.sessionId = sessionId;
  }
}

export function recordGeminiUsageMetric(input: {
  model?: string;
  durationMs: number;
  usage?: GeminiUsageMetadata | null;
}) {
  const usage = input.usage ?? {};
  const store = requestMetricsStorage.getStore();

  if (store) {
    store.geminiCalls.push({
      model: input.model,
      durationMs: input.durationMs,
      usage,
    });
  }

  console.log(
    JSON.stringify({
      tag: "gemini_usage",
      model: input.model,
      durationMs: input.durationMs,
      promptTokenCount: usage.promptTokenCount ?? null,
      candidatesTokenCount: usage.candidatesTokenCount ?? null,
      totalTokenCount: usage.totalTokenCount ?? null,
      sessionId: store?.sessionId ?? null,
      path: store?.path ?? null,
      method: store?.method ?? null,
    })
  );
}

function sumTokens(
  calls: GeminiCallMetric[],
  key: keyof GeminiUsageMetadata
): number {
  return calls.reduce((sum, call) => sum + (call.usage[key] ?? 0), 0);
}

export function buildRequestCostSummary(input: {
  store: RequestMetricStore;
  statusCode: number;
  durationMs: number;
}) {
  const { store, statusCode, durationMs } = input;
  const totalPromptTokens = sumTokens(store.geminiCalls, "promptTokenCount");
  const totalCandidatesTokens = sumTokens(store.geminiCalls, "candidatesTokenCount");
  const totalTokens = sumTokens(store.geminiCalls, "totalTokenCount");

  const geminiPricePer1kTokensUsd = parseNumberEnv(
    "GEMINI_PRICE_PER_1K_TOKENS_USD"
  );
  const vcpuPricePerSecUsd = parseNumberEnv(
    "CLOUD_RUN_VCPU_PRICE_PER_SEC_USD",
    0.000024
  )!;
  const memoryPricePerGbSecUsd = parseNumberEnv(
    "CLOUD_RUN_MEMORY_PRICE_PER_GB_SEC_USD",
    0.0000025
  )!;
  const allocatedVcpu = parseNumberEnv("CLOUD_RUN_ALLOCATED_VCPU", 1)!;
  const allocatedMemoryGb = parseNumberEnv("CLOUD_RUN_ALLOCATED_MEMORY_GB", 0.5)!;

  const durationSec = durationMs / 1000;
  const cloudRunCpuCostUsd = durationSec * allocatedVcpu * vcpuPricePerSecUsd;
  const cloudRunMemoryCostUsd =
    durationSec * allocatedMemoryGb * memoryPricePerGbSecUsd;
  const cloudRunEstimatedCostUsd = cloudRunCpuCostUsd + cloudRunMemoryCostUsd;
  const geminiEstimatedCostUsd =
    geminiPricePer1kTokensUsd == null
      ? null
      : (totalTokens / 1000) * geminiPricePer1kTokensUsd;
  const totalEstimatedCostUsd =
    geminiEstimatedCostUsd == null
      ? null
      : geminiEstimatedCostUsd + cloudRunEstimatedCostUsd;

  return {
    tag: "request_cost_summary",
    method: store.method,
    path: store.path,
    sessionId: store.sessionId ?? null,
    statusCode,
    durationMs,
    geminiCallCount: store.geminiCalls.length,
    geminiPromptTokens: totalPromptTokens,
    geminiCandidateTokens: totalCandidatesTokens,
    geminiTotalTokens: totalTokens,
    geminiPricePer1kTokensUsd: geminiPricePer1kTokensUsd ?? null,
    geminiEstimatedCostUsd,
    cloudRunAllocatedVcpu: allocatedVcpu,
    cloudRunAllocatedMemoryGb: allocatedMemoryGb,
    cloudRunVcpuPricePerSecUsd: vcpuPricePerSecUsd,
    cloudRunMemoryPricePerGbSecUsd: memoryPricePerGbSecUsd,
    cloudRunEstimatedCostUsd,
    totalEstimatedCostUsd,
  };
}
