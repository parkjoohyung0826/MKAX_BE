import { Prisma } from "@prisma/client";
import { normalize } from "../common/textProcessing";
import { prisma } from "../infra/db/prisma";
import { ResumeFormatResult } from "./resumeFormat.service";

export type RecruitmentRagSource = {
  recrutPblntSn: number;
  instNm?: unknown;
  recrutPbancTtl?: unknown;
  recrutSeNm?: unknown;
  ncsCdNmLst?: unknown;
  hireTypeNmLst?: unknown;
  workRgnNmLst?: unknown;
  acbgCondNmLst?: unknown;
  aplyQlfcCn?: unknown;
  prefCn?: unknown;
};

export type RecruitmentPromptDocument = {
  recrutPblntSn: number;
  instNm: string;
  title: string;
  recruitType: string;
  region: string;
  field: string;
  education: string;
  qualification: string;
  preference: string;
  evidenceCandidates: string[];
};

export type RecruitmentRetrievalMode = "keyword" | "vector";

export type RecruitmentRetrievedPosting = {
  recrutPblntSn: number;
  instNm: string;
  recrutPbancTtl: string;
  recrutSeNm: string;
  aplyQlfcCn: string;
  prefCn: string;
  pbancBgngYmd: string | null;
  pbancEndYmd: string | null;
  ongoingYn: string | null;
  ncsCdNmLst: string;
  hireTypeNmLst: string;
  workRgnNmLst: string;
  acbgCondNmLst: string;
  raw: Prisma.JsonValue;
};

type RecruitmentRetrievalProfile = {
  query: string;
  desiredJob: string;
  queryTerms: string[];
  desiredJobTerms: string[];
};

const recruitmentPostingSelect = {
  recrutPblntSn: true,
  instNm: true,
  recrutPbancTtl: true,
  recrutSeNm: true,
  aplyQlfcCn: true,
  prefCn: true,
  pbancBgngYmd: true,
  pbancEndYmd: true,
  ongoingYn: true,
  ncsCdNmLst: true,
  hireTypeNmLst: true,
  workRgnNmLst: true,
  acbgCondNmLst: true,
  searchText: true,
  raw: true,
} satisfies Prisma.RecruitmentPostingSelect;

type RecruitmentPostingForRetrieval = Prisma.RecruitmentPostingGetPayload<{
  select: typeof recruitmentPostingSelect;
}>;

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function tokenizeRetrievalText(value: string, max = 12): string[] {
  const seen = new Set<string>();
  const tokens = normalize(value)
    .toLowerCase()
    .split(/[\s,./()\-_[\]{}|:;'"`~!@#$%^&*+=?<>\\]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  for (const token of tokens) {
    seen.add(token);
    if (seen.size >= max) break;
  }

  return Array.from(seen);
}

function buildRecruitmentRetrievalQuery(resume: ResumeFormatResult): string {
  const education = resume.education
    .map((item) => `${item.schoolName} ${item.major} ${item.details}`)
    .join(" ");
  const work = resume.workExperience
    .map((item) => `${item.companyName} ${item.mainTask}`)
    .join(" ");
  const competencies = resume.coreCompetencies
    .map((item) => item.fullDescription)
    .join(" ");
  const certifications = resume.certifications
    .map((item) => `${item.certificationName} ${item.institution}`)
    .join(" ");

  return [
    resume.desiredJob,
    resume.address,
    education,
    work,
    competencies,
    certifications,
  ]
    .map(normalize)
    .filter(Boolean)
    .join(" ");
}

function resolveRetrievalMode(): RecruitmentRetrievalMode {
  return process.env.RECRUITMENT_RETRIEVAL_MODE === "vector"
    ? "vector"
    : "keyword";
}

function buildRetrievalProfile(resume: ResumeFormatResult): RecruitmentRetrievalProfile {
  const query = buildRecruitmentRetrievalQuery(resume);
  const desiredJob = normalize(resume.desiredJob).toLowerCase();

  return {
    query,
    desiredJob,
    queryTerms: tokenizeRetrievalText(query, 16),
    desiredJobTerms: tokenizeRetrievalText(desiredJob, 8),
  };
}

function countTermHits(text: string, terms: string[]) {
  if (terms.length === 0) return 0;
  const target = normalize(text).toLowerCase();
  let hits = 0;
  for (const term of terms) {
    if (target.includes(term)) hits += 1;
  }
  return hits;
}

function computeKeywordRetrievalScore(
  posting: RecruitmentPostingForRetrieval,
  profile: RecruitmentRetrievalProfile
) {
  const title = normalize(posting.recrutPbancTtl);
  const field = normalize(posting.ncsCdNmLst);
  const qualification = normalize(posting.aplyQlfcCn);
  const preference = normalize(posting.prefCn);
  const searchText = normalize(posting.searchText);

  let score = 0;
  score += countTermHits(title, profile.desiredJobTerms) * 12;
  score += countTermHits(field, profile.desiredJobTerms) * 10;
  score += countTermHits(qualification, profile.desiredJobTerms) * 6;
  score += countTermHits(preference, profile.desiredJobTerms) * 4;
  score += countTermHits(searchText, profile.queryTerms) * 2;

  if (profile.desiredJob && `${title} ${field}`.toLowerCase().includes(profile.desiredJob)) {
    score += 20;
  }

  return score;
}

function sortRetrievedPostings(
  postings: RecruitmentPostingForRetrieval[],
  profile: RecruitmentRetrievalProfile
) {
  return postings
    .map((posting) => ({
      posting,
      score: computeKeywordRetrievalScore(posting, profile),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aEnd = normalize(a.posting.pbancEndYmd);
      const bEnd = normalize(b.posting.pbancEndYmd);
      if (aEnd !== bEnd) return aEnd.localeCompare(bEnd, "ko");
      return b.posting.recrutPblntSn - a.posting.recrutPblntSn;
    })
    .map((entry) => entry.posting);
}

export function normalizeGeneratedList(value: unknown, maxItems = 5): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalize(item))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function buildRecruitmentEvidence(source: RecruitmentRagSource): string[] {
  const evidence = [
    normalize(source.instNm) ? `기관: ${normalize(source.instNm)}` : "",
    normalize(source.recrutPbancTtl)
      ? `공고명: ${normalize(source.recrutPbancTtl)}`
      : "",
    normalize(source.recrutSeNm) ? `채용구분: ${normalize(source.recrutSeNm)}` : "",
    normalize(source.ncsCdNmLst) ? `직무/분야: ${normalize(source.ncsCdNmLst)}` : "",
    normalize(source.workRgnNmLst)
      ? `근무지역: ${normalize(source.workRgnNmLst)}`
      : "",
    normalize(source.acbgCondNmLst)
      ? `학력조건: ${normalize(source.acbgCondNmLst)}`
      : "",
    normalize(source.aplyQlfcCn)
      ? `자격요건: ${truncateText(normalize(source.aplyQlfcCn), 180)}`
      : "",
    normalize(source.prefCn)
      ? `우대사항: ${truncateText(normalize(source.prefCn), 180)}`
      : "",
  ].filter(Boolean);

  return evidence.slice(0, 6);
}

export function buildRecruitmentPromptDocument(
  source: RecruitmentRagSource
): RecruitmentPromptDocument {
  return {
    recrutPblntSn: source.recrutPblntSn,
    instNm: normalize(source.instNm),
    title: normalize(source.recrutPbancTtl),
    recruitType: normalize(source.recrutSeNm),
    region: normalize(source.workRgnNmLst),
    field: normalize(source.ncsCdNmLst),
    education: normalize(source.acbgCondNmLst),
    qualification: truncateText(normalize(source.aplyQlfcCn), 300),
    preference: truncateText(normalize(source.prefCn), 200),
    evidenceCandidates: buildRecruitmentEvidence(source),
  };
}

export function filterRetrievedEvidence(
  generatedEvidence: unknown,
  evidenceCandidates: string[],
  maxItems = 4
): string[] {
  return normalizeGeneratedList(generatedEvidence, maxItems).filter((evidence) =>
    evidenceCandidates.includes(evidence)
  );
}

export function buildFallbackCoverLetterTips(
  source: RecruitmentRagSource,
  resume: ResumeFormatResult
): string[] {
  const tips: string[] = [];
  const desiredJob = normalize(resume.desiredJob);
  const title = normalize(source.recrutPbancTtl);
  const qualification = normalize(source.aplyQlfcCn);
  const preference = normalize(source.prefCn);

  if (desiredJob || title) {
    tips.push(
      `${desiredJob || title}와 직접 연결되는 경험을 첫 문단에서 명확히 제시하세요.`
    );
  }
  if (qualification) {
    tips.push("자격요건에 맞는 경력, 교육, 자격증을 본문에서 구체적으로 연결하세요.");
  }
  if (preference) {
    tips.push("우대사항과 겹치는 경험이 있다면 역할, 행동, 결과 순서로 보강하세요.");
  }
  if (tips.length === 0) {
    tips.push("공고의 직무명과 본인의 핵심 경험이 연결되도록 지원동기를 작성하세요.");
  }

  return tips.slice(0, 3);
}

export async function retrieveRecruitmentCandidates(
  resume: ResumeFormatResult,
  limit: number
): Promise<RecruitmentRetrievedPosting[]> {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 1000;
  const mode = resolveRetrievalMode();

  if (mode === "vector") {
    console.warn(
      "[recruitmentRag] vector retrieval is not configured; falling back to keyword retrieval"
    );
  }

  return retrieveRecruitmentCandidatesByKeyword(resume, safeLimit);
}

async function retrieveRecruitmentCandidatesByKeyword(
  resume: ResumeFormatResult,
  limit: number
): Promise<RecruitmentRetrievedPosting[]> {
  const profile = buildRetrievalProfile(resume);
  const terms = profile.queryTerms;
  const fetchLimit = Math.min(Math.max(limit * 3, limit), 5000);
  const where: Prisma.RecruitmentPostingWhereInput = {
    isActive: true,
    isOngoing: true,
  };

  if (terms.length > 0) {
    where.OR = terms.flatMap((term) => [
      { recrutPbancTtl: { contains: term, mode: "insensitive" } },
      { instNm: { contains: term, mode: "insensitive" } },
      { searchText: { contains: term, mode: "insensitive" } },
    ]);
  }

  const postings = await prisma.recruitmentPosting.findMany({
    where,
    take: fetchLimit,
    orderBy: [
      { updatedAt: "desc" },
      { pbancEndYmd: "asc" },
      { recrutPblntSn: "desc" },
    ],
    select: recruitmentPostingSelect,
  });

  if (postings.length > 0 || terms.length === 0) {
    return sortRetrievedPostings(postings, profile).slice(0, limit);
  }

  const fallbackPostings = await prisma.recruitmentPosting.findMany({
    where: {
      isActive: true,
      isOngoing: true,
    },
    take: limit,
    orderBy: [
      { updatedAt: "desc" },
      { pbancEndYmd: "asc" },
      { recrutPblntSn: "desc" },
    ],
    select: recruitmentPostingSelect,
  });

  return fallbackPostings;
}
