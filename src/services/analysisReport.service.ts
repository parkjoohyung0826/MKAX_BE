import { genAI, GEMINI_MODEL } from "../common/gemini";
import { ResumeFormatResult } from "./resumeFormat.service";

export type CoverLetterData = {
  growthProcess: string;
  strengthsAndWeaknesses: string;
  keyExperience: string;
  motivation: string;
};

export type ScoreBreakdownItem = {
  item: string;
  score: number;
  maxScore: number;
  scoreText: string;
  deductionReason: string;
};

export type SentenceFeedbackItem = {
  title: string;
  deductionItems: string[];
  before: string;
  deductionReason: string;
  improvement: string[];
  after: string;
};

export type CommonDeductionPattern = {
  pattern: string;
  description: string;
};

export type GapSummaryItem = {
  category: string;
  gap: string;
  description: string;
};

export type ImprovementCategoryGuide = {
  title: string;
  currentState: string[];
  direction: string[];
  examples: string[];
};

export type RoadmapWeekItem = {
  week: string;
  title: string;
  tasks: string[];
};

export type PriorityStrategyItem = {
  priority: number;
  item: string;
  reason: string;
};

export type AnalysisReportResult = {
  totalScore: number;
  totalScoreText: string;
  oneLineSummary: string;
  overallDescription: string;
  strengths: string[];
  improvements: string[];
  scoreBreakdown: ScoreBreakdownItem[];
  scoreBreakdownTotal: {
    score: number;
    maxScore: number;
    scoreText: string;
  };
  sentenceFeedback: {
    resume: SentenceFeedbackItem[];
    coverLetter: SentenceFeedbackItem[];
    commonPatterns: CommonDeductionPattern[];
  };
  improvementGuide: {
    gapSummary: GapSummaryItem[];
    categoryGuides: ImprovementCategoryGuide[];
    roadmap: RoadmapWeekItem[];
    priorityStrategy: PriorityStrategyItem[];
  };
};

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalize(item))
    .filter((item) => item.length > 0);
}

function normalizeSentenceFeedback(value: unknown): SentenceFeedbackItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    title: normalize(item?.title),
    deductionItems: normalizeList(item?.deductionItems),
    before: normalize(item?.before),
    deductionReason: normalize(item?.deductionReason),
    improvement: normalizeList(item?.improvement),
    after: normalize(item?.after),
  }));
}

function normalizeCommonPatterns(value: unknown): CommonDeductionPattern[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    pattern: normalize(item?.pattern),
    description: normalize(item?.description),
  }));
}

function normalizeGapSummary(value: unknown): GapSummaryItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    category: normalize(item?.category),
    gap: normalize(item?.gap),
    description: normalize(item?.description),
  }));
}

function normalizeCategoryGuides(value: unknown): ImprovementCategoryGuide[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    title: normalize(item?.title),
    currentState: normalizeList(item?.currentState),
    direction: normalizeList(item?.direction),
    examples: normalizeList(item?.examples),
  }));
}

function normalizeRoadmap(value: unknown): RoadmapWeekItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    week: normalize(item?.week),
    title: normalize(item?.title),
    tasks: normalizeList(item?.tasks),
  }));
}

function normalizePriorityStrategy(value: unknown): PriorityStrategyItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    priority: clamp(toNumber(item?.priority, 0), 1, 99),
    item: normalize(item?.item),
    reason: normalize(item?.reason),
  }));
}

function buildScoreText(score: number, maxScore: number): string {
  return `${score} / ${maxScore}`;
}

function buildTotalScoreText(score: number, maxScore: number): string {
  return `${score} / ${maxScore}점`;
}

function fallbackReport(): AnalysisReportResult {
  const totalScore = 0;
  const maxScore = 100;
  return {
    totalScore,
    totalScoreText: buildTotalScoreText(totalScore, maxScore),
    oneLineSummary: "분석을 위해 더 많은 정보가 필요합니다.",
    overallDescription:
      "제출된 이력서 및 자기소개서의 정보가 부족하거나 형식이 불완전하여 상세한 분석을 진행할 수 없습니다.",
    strengths: [],
    improvements: [
      "이력서 항목을 구체적으로 작성해주세요.",
      "자기소개서 문항별 내용과 경험을 명확히 작성해주세요.",
    ],
    scoreBreakdown: [],
    scoreBreakdownTotal: {
      score: totalScore,
      maxScore,
      scoreText: buildScoreText(totalScore, maxScore),
    },
    sentenceFeedback: {
      resume: [],
      coverLetter: [],
      commonPatterns: [],
    },
    improvementGuide: {
      gapSummary: [],
      categoryGuides: [],
      roadmap: [],
      priorityStrategy: [],
    },
  };
}

export async function analyzeResumeAndCoverLetter(
  resume: ResumeFormatResult,
  coverLetter: CoverLetterData
): Promise<AnalysisReportResult> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const systemPrompt = `
너는 이력서와 자기소개서를 분석하는 AI 평가관이야.
입력 데이터를 바탕으로 아래 JSON 형식으로만 출력해. (추가 텍스트 절대 금지)

{
  "totalScore": number,
  "totalScoreText": string,
  "oneLineSummary": string,
  "overallDescription": string,
  "strengths": string[],
  "improvements": string[],
  "scoreBreakdown": [
    {
      "item": string,
      "score": number,
      "maxScore": number,
      "scoreText": string,
      "deductionReason": string
    }
  ],
  "scoreBreakdownTotal": {
    "score": number,
    "maxScore": number,
    "scoreText": string
  },
  "sentenceFeedback": {
    "resume": [
      {
        "title": string,
        "deductionItems": string[],
        "before": string,
        "deductionReason": string,
        "improvement": string[],
        "after": string
      }
    ],
    "coverLetter": [
      {
        "title": string,
        "deductionItems": string[],
        "before": string,
        "deductionReason": string,
        "improvement": string[],
        "after": string
      }
    ],
    "commonPatterns": [
      {
        "pattern": string,
        "description": string
      }
    ]
  },
  "improvementGuide": {
    "gapSummary": [
      {
        "category": string,
        "gap": string,
        "description": string
      }
    ],
    "categoryGuides": [
      {
        "title": string,
        "currentState": string[],
        "direction": string[],
        "examples": string[]
      }
    ],
    "roadmap": [
      {
        "week": string,
        "title": string,
        "tasks": string[]
      }
    ],
    "priorityStrategy": [
      {
        "priority": number,
        "item": string,
        "reason": string
      }
    ]
  }
}

규칙:
- 총점은 0~100.
- scoreBreakdown 항목들의 maxScore 합은 100이 되도록 구성.
- scoreBreakdownTotal.score는 항목 점수 합계.
- scoreText는 "{score} / {maxScore}" 형식.
- totalScoreText는 "{totalScore} / 100점" 형식.
- strengths/improvements는 3~6개 불릿 문장.
- sentenceFeedback는 실제 문장을 인용하여 개선 가이드를 제공한다.
- sentenceFeedback의 deductionItems는 반드시 scoreBreakdown.item 중에서만 선택한다.
- improvementGuide는 경험/역량 보완 가이드와 실행 로드맵을 제공한다.
- 입력에 없는 사실을 추정하거나 과장하지 않는다.
`;

  const userPrompt = `resume: ${JSON.stringify(resume)}\ncoverLetter: ${JSON.stringify(
    coverLetter
  )}`;

  const result = await model.generateContent([systemPrompt, userPrompt]);
  const text = result.response.text();

  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return fallbackReport();
  }

  const scoreBreakdown: ScoreBreakdownItem[] = Array.isArray(parsed.scoreBreakdown)
    ? parsed.scoreBreakdown.map((item: any) => {
        const score = toNumber(item?.score, 0);
        const maxScore = toNumber(item?.maxScore, 0);
        return {
          item: normalize(item?.item),
          score: clamp(score, 0, Math.max(0, maxScore)),
          maxScore: Math.max(0, maxScore),
          scoreText: buildScoreText(
            clamp(score, 0, Math.max(0, maxScore)),
            Math.max(0, maxScore)
          ),
          deductionReason: normalize(item?.deductionReason),
        };
      })
    : [];

  const sumScore = scoreBreakdown.reduce((acc, item) => acc + item.score, 0);
  const sumMaxScore = scoreBreakdown.reduce(
    (acc, item) => acc + item.maxScore,
    0
  );

  const maxScoreTotal = sumMaxScore > 0 ? sumMaxScore : 100;
  const totalScore = clamp(sumScore, 0, maxScoreTotal);

  return {
    totalScore,
    totalScoreText: buildTotalScoreText(totalScore, 100),
    oneLineSummary: normalize(parsed.oneLineSummary),
    overallDescription: normalize(parsed.overallDescription),
    strengths: normalizeList(parsed.strengths),
    improvements: normalizeList(parsed.improvements),
    scoreBreakdown,
    scoreBreakdownTotal: {
      score: totalScore,
      maxScore: maxScoreTotal,
      scoreText: buildScoreText(totalScore, maxScoreTotal),
    },
    sentenceFeedback: {
      resume: normalizeSentenceFeedback(parsed.sentenceFeedback?.resume),
      coverLetter: normalizeSentenceFeedback(parsed.sentenceFeedback?.coverLetter),
      commonPatterns: normalizeCommonPatterns(parsed.sentenceFeedback?.commonPatterns),
    },
    improvementGuide: {
      gapSummary: normalizeGapSummary(parsed.improvementGuide?.gapSummary),
      categoryGuides: normalizeCategoryGuides(parsed.improvementGuide?.categoryGuides),
      roadmap: normalizeRoadmap(parsed.improvementGuide?.roadmap),
      priorityStrategy: normalizePriorityStrategy(
        parsed.improvementGuide?.priorityStrategy
      ),
    },
  };
}
