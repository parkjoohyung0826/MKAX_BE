import { genAI, GEMINI_MODEL } from "../common/gemini";
import { Prisma } from "@prisma/client";
import { prisma } from "../infra/db/prisma";
import { ResumeFormatResult } from "./resumeFormat.service";

type CoverLetterInput = {
  growthProcess?: string;
  strengthsAndWeaknesses?: string;
  keyExperience?: string;
  motivation?: string;
};

type RecruitmentFile = {
  recrutAtchFileNo?: number;
  sortNo?: number;
  atchFileNm?: string;
  atchFileType?: string;
  url?: string;
};

type RecruitmentStep = {
  recrutStepSn?: number;
  recrutPblntSn?: number;
  recrutPbancTtl?: string;
  recrutNope?: number | null;
  aplyNope?: number | null;
  cmpttRt?: number | null;
  rsnOcrnYmd?: string | null;
  sortNo?: number;
  minStepSn?: number;
  maxStepSn?: number;
};

type RecruitmentItem = {
  recrutPblntSn: number;
  pblntInstCd?: string;
  pbadmsStdInstCd?: string;
  instNm?: string;
  ncsCdLst?: string;
  recrutPbancTtl?: string;
  recrutSe?: string;
  recrutSeNm?: string;
  prefCondCn?: string;
  pbancBgngYmd?: string;
  pbancEndYmd?: string;
  acbgCondLst?: string;
  acbgCondNmLst?: string;
  recrutNope?: number;
  hireTypeLst?: string;
  hireTypeNmLst?: string;
  ncsCdNmLst?: string;
  workRgnLst?: string;
  workRgnNmLst?: string;
  replmprYn?: string;
  aplyQlfcCn?: string;
  disqlfcRsn?: string;
  prefCn?: string;
  scrnprcdrMthdExpln?: string;
  nonatchRsn?: string | null;
  ongoingYn?: string | null;
  decimalDay?: number;
  files?: RecruitmentFile[];
  steps?: RecruitmentStep[];
  srcUrl?: string;
};

type ScoredRecruitment = RecruitmentItem & {
  matchScore: number;
  matchReason: string;
};

export type RecruitmentMatchItem = ScoredRecruitment & {
  ncsCdNmList: string[];
  hireTypeNmList: string[];
  workRgnNmList: string[];
  acbgCondNmList: string[];
};

export type RecruitmentListResult = {
  items: RecruitmentMatchItem[];
  total: number;
  nextOffset: number;
  hasMore: boolean;
};

export type RecruitmentListFilters = {
  q?: string;
  regions?: string[];
  fields?: string[];
  careerTypes?: string[];
  educationLevels?: string[];
  hireTypes?: string[];
  includeClosed?: boolean;
};

export type RecruitmentSyncResult = {
  totalFetched: number;
  inserted: number;
  updated: number;
  deactivated: number;
  pageCount: number;
  syncedAt: string;
};

export type RecruitmentFilterOptionsResult = {
  regions: string[];
  fields: string[];
  careerTypes: string[];
  educationLevels: string[];
  hireTypes: string[];
};

const REGION_KEYWORDS = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "광주",
  "대전",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
  "전국",
];

let syncInFlight: Promise<RecruitmentSyncResult> | null = null;

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function splitCsv(value: unknown) {
  return normalize(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitCareerType(value: unknown) {
  const raw = normalize(value);
  if (!raw) return [];

  const values = raw
    .split(/[\/,|]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (raw.includes("신입")) values.push("신입");
  if (raw.includes("경력")) values.push("경력");
  return values;
}

function sortUnique(values: Set<string>) {
  return Array.from(values).sort((a, b) => a.localeCompare(b, "ko"));
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function isOngoingRecruitment(item: RecruitmentItem) {
  const ongoing = normalize(item.ongoingYn).toUpperCase();
  if (!ongoing) return true;
  return ongoing !== "N";
}

function buildSearchText(item: RecruitmentItem) {
  return [
    normalize(item.instNm),
    normalize(item.recrutPbancTtl),
    normalize(item.recrutSeNm),
    normalize(item.aplyQlfcCn),
    normalize(item.prefCn),
    normalize(item.ncsCdNmLst),
    normalize(item.workRgnNmLst),
    normalize(item.hireTypeNmLst),
    normalize(item.acbgCondNmLst),
  ]
    .filter(Boolean)
    .join(" ");
}

function extractRegion(address: string) {
  for (const region of REGION_KEYWORDS) {
    if (address.includes(region)) return region;
  }
  return "";
}

function matchesEducation(job: RecruitmentItem, resume: ResumeFormatResult) {
  const condition = normalize(job.acbgCondNmLst);
  if (!condition || condition.includes("학력무관")) return true;

  const hasCollege = resume.education.some((item) => {
    const status = normalize(item.graduationStatus);
    return status.includes("졸업") || status.includes("재학") || status.includes("수료");
  });

  if (condition.includes("대졸") || condition.includes("대학")) {
    return hasCollege;
  }

  return true;
}

function matchesCareer(job: RecruitmentItem, resume: ResumeFormatResult) {
  const type = normalize(job.recrutSeNm);
  const hasExperience = resume.workExperience.length > 0;

  if (!type) return true;

  if (type.includes("신입") && type.includes("경력")) return true;
  if (type.includes("경력")) return hasExperience;
  if (type.includes("신입")) return !hasExperience;

  return true;
}

function matchesRegion(job: RecruitmentItem, resume: ResumeFormatResult) {
  const region = extractRegion(resume.address);
  const jobRegion = normalize(job.workRgnNmLst);
  if (!region || !jobRegion) return true;
  if (jobRegion.includes("전국")) return true;
  return jobRegion.includes(region);
}

function buildProfileSummary(resume: ResumeFormatResult, coverLetter?: CoverLetterInput) {
  const education = resume.education
    .map((item) => `${item.schoolName} ${item.major} ${item.graduationStatus}`)
    .join("; ");
  const work = resume.workExperience
    .map((item) => `${item.companyName} ${item.mainTask}`)
    .join("; ");
  const competencies = resume.coreCompetencies
    .map((item) => item.fullDescription)
    .join("; ");
  const certifications = resume.certifications
    .map((item) => `${item.certificationName} ${item.institution}`)
    .join("; ");

  const cover = coverLetter
    ? [
        coverLetter.growthProcess,
        coverLetter.strengthsAndWeaknesses,
        coverLetter.keyExperience,
        coverLetter.motivation,
      ]
        .map(normalize)
        .filter(Boolean)
        .join(" ")
    : "";

  const summary = [
    `희망 직무: ${resume.desiredJob}`,
    `학력: ${education}`,
    `경력: ${work}`,
    `핵심 역량: ${competencies}`,
    `자격증: ${certifications}`,
    cover ? `자기소개서 요약: ${cover}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return truncateText(summary, 2000);
}

async function scoreRecruitmentsBatch(
  jobs: RecruitmentItem[],
  profileSummary: string
): Promise<Record<number, { matchScore: number; matchReason: string }>> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const systemPrompt = `
너는 채용 공고와 지원자 정보를 비교해 적합도를 평가하는 AI다.
아래 정보를 보고 JSON 형식으로만 출력해.

{
  "items": [
    {
      "recrutPblntSn": number,
      "matchScore": number,
      "matchReason": string
    }
  ]
}

규칙:
- matchScore는 0~100 사이 정수.
- matchReason은 1~2문장으로 간단히.
- 과장하지 말고 입력 정보에 근거해서 판단.
- 출력 항목은 입력된 공고 리스트에 대해서만 작성한다.
`;

  const jobSummaries = jobs.map((job) => ({
    recrutPblntSn: job.recrutPblntSn,
    instNm: normalize(job.instNm),
    title: normalize(job.recrutPbancTtl),
    recruitType: normalize(job.recrutSeNm),
    region: normalize(job.workRgnNmLst),
    qualification: truncateText(normalize(job.aplyQlfcCn), 300),
    preference: truncateText(normalize(job.prefCn), 200),
  }));

  const userPrompt = `지원자 정보:\n${profileSummary}\n\n공고 목록(JSON):\n${JSON.stringify(
    jobSummaries
  )}`;

  try {
    const result = await model.generateContent([systemPrompt, userPrompt]);
    const text = result.response.text();
    const cleaned = text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const resultMap: Record<number, { matchScore: number; matchReason: string }> =
      {};
    for (const item of items) {
      const sn = Number(item?.recrutPblntSn);
      if (!Number.isFinite(sn)) continue;
      const score = Number(item?.matchScore);
      resultMap[sn] = {
        matchScore: Number.isFinite(score)
          ? Math.max(0, Math.min(100, score))
          : 0,
        matchReason: normalize(item?.matchReason),
      };
    }
    return resultMap;
  } catch {
    return {};
  }
}

export async function fetchRecruitments(pageNo = 1, numOfRows = 50) {
  const { items } = await fetchRecruitmentsWithMeta(pageNo, numOfRows);
  return items;
}

export async function fetchRecruitmentsWithMeta(pageNo = 1, numOfRows = 50) {
  const serviceKey = process.env.RECRUITMENT_SERVICE_KEY;
  if (!serviceKey) {
    throw new Error("Missing RECRUITMENT_SERVICE_KEY");
  }

  const params = new URLSearchParams({
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
    resultType: "json",
  });
  const encodedKey = serviceKey.includes("%")
    ? serviceKey
    : encodeURIComponent(serviceKey);
  const url = `https://apis.data.go.kr/1051000/recruitment/list?serviceKey=${encodedKey}&${params.toString()}`;

  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Request failed: ${response.status}`);
  }

  const data = JSON.parse(text);
  return {
    items: (data?.result ?? []) as RecruitmentItem[],
    totalCount: Number(data?.totalCount ?? 0),
  };
}

export async function fetchRecruitmentDetail(sn: number) {
  const serviceKey = process.env.RECRUITMENT_SERVICE_KEY;
  if (!serviceKey) {
    throw new Error("Missing RECRUITMENT_SERVICE_KEY");
  }

  const params = new URLSearchParams({
    sn: String(sn),
    resultType: "json",
  });
  const encodedKey = serviceKey.includes("%")
    ? serviceKey
    : encodeURIComponent(serviceKey);
  const url = `https://apis.data.go.kr/1051000/recruitment/detail?serviceKey=${encodedKey}&${params.toString()}`;

  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Request failed: ${response.status}`);
  }

  const data = JSON.parse(text);
  if (String(data?.resultCode) !== "200") {
    throw new Error(data?.resultMsg || "Failed to fetch recruitment detail");
  }

  return (data?.result ?? null) as RecruitmentItem | null;
}

function buildPostingWhere(filters: RecruitmentListFilters): Prisma.RecruitmentPostingWhereInput {
  const where: Prisma.RecruitmentPostingWhereInput = {
    isActive: true,
  };

  if (!filters.includeClosed) {
    where.isOngoing = true;
  }

  const andConditions: Prisma.RecruitmentPostingWhereInput[] = [];

  const keyword = normalize(filters.q);
  if (keyword) {
    const terms = keyword.split(/\s+/).filter(Boolean);
    for (const term of terms) {
      andConditions.push({
        OR: [
          { recrutPbancTtl: { contains: term, mode: "insensitive" } },
          { instNm: { contains: term, mode: "insensitive" } },
          { searchText: { contains: term, mode: "insensitive" } },
        ],
      });
    }
  }

  const regions = (filters.regions ?? []).map(normalize).filter(Boolean);
  if (regions.length > 0) {
    andConditions.push({ workRgnNmList: { hasSome: regions } });
  }

  const fields = (filters.fields ?? []).map(normalize).filter(Boolean);
  if (fields.length > 0) {
    andConditions.push({ ncsCdNmList: { hasSome: fields } });
  }

  const hireTypes = (filters.hireTypes ?? []).map(normalize).filter(Boolean);
  if (hireTypes.length > 0) {
    andConditions.push({ hireTypeNmList: { hasSome: hireTypes } });
  }

  const educationLevels = (filters.educationLevels ?? [])
    .map(normalize)
    .filter(Boolean);
  if (educationLevels.length > 0) {
    andConditions.push({ acbgCondNmList: { hasSome: educationLevels } });
  }

  const careerTypes = (filters.careerTypes ?? []).map(normalize).filter(Boolean);
  if (careerTypes.length > 0) {
    andConditions.push({
      OR: careerTypes.map((careerType) => ({
        recrutSeNm: { contains: careerType, mode: "insensitive" },
      })),
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}

async function upsertRecruitmentsBatch(
  items: RecruitmentItem[],
  seenAt: Date
): Promise<{ inserted: number; updated: number }> {
  if (items.length === 0) {
    return { inserted: 0, updated: 0 };
  }

  const sns = items.map((item) => item.recrutPblntSn);
  const existingRows = await prisma.recruitmentPosting.findMany({
    where: { recrutPblntSn: { in: sns } },
    select: { recrutPblntSn: true },
  });
  const existingSet = new Set(existingRows.map((row) => row.recrutPblntSn));

  await prisma.$transaction(
    items.map((item) => {
      const ncsCdNmList = splitCsv(item.ncsCdNmLst);
      const hireTypeNmList = splitCsv(item.hireTypeNmLst);
      const workRgnNmList = splitCsv(item.workRgnNmLst);
      const acbgCondNmList = splitCsv(item.acbgCondNmLst);
      const commonData = {
        instNm: normalize(item.instNm),
        recrutPbancTtl: normalize(item.recrutPbancTtl),
        recrutSeNm: normalize(item.recrutSeNm),
        aplyQlfcCn: normalize(item.aplyQlfcCn),
        prefCn: normalize(item.prefCn),
        pbancBgngYmd: normalize(item.pbancBgngYmd) || null,
        pbancEndYmd: normalize(item.pbancEndYmd) || null,
        ongoingYn: normalize(item.ongoingYn) || null,
        isActive: true,
        isOngoing: isOngoingRecruitment(item),
        ncsCdNmLst: normalize(item.ncsCdNmLst),
        hireTypeNmLst: normalize(item.hireTypeNmLst),
        workRgnNmLst: normalize(item.workRgnNmLst),
        acbgCondNmLst: normalize(item.acbgCondNmLst),
        ncsCdNmList,
        hireTypeNmList,
        workRgnNmList,
        acbgCondNmList,
        searchText: buildSearchText(item),
        raw: toInputJson(item),
        lastSeenAt: seenAt,
      };
      return prisma.recruitmentPosting.upsert({
        where: { recrutPblntSn: item.recrutPblntSn },
        create: {
          recrutPblntSn: item.recrutPblntSn,
          ...commonData,
        },
        update: commonData,
      });
    })
  );

  return {
    inserted: items.length - existingSet.size,
    updated: existingSet.size,
  };
}

async function performRecruitmentSync(): Promise<RecruitmentSyncResult> {
  const syncStartedAt = new Date();
  const pageSize = Math.min(
    parsePositiveInt(process.env.RECRUITMENT_SYNC_PAGE_SIZE, 100),
    200
  );
  const maxPages = parsePositiveInt(process.env.RECRUITMENT_SYNC_MAX_PAGES, 100);

  let pageNo = 1;
  let totalFetched = 0;
  let inserted = 0;
  let updated = 0;
  let pageCount = 0;
  let totalCount = 0;

  while (pageNo <= maxPages) {
    const { items, totalCount: fetchedTotal } = await fetchRecruitmentsWithMeta(
      pageNo,
      pageSize
    );
    totalCount = fetchedTotal;
    pageCount += 1;

    if (items.length === 0) {
      break;
    }

    const batchResult = await upsertRecruitmentsBatch(items, syncStartedAt);
    inserted += batchResult.inserted;
    updated += batchResult.updated;
    totalFetched += items.length;

    if (totalCount > 0 && totalFetched >= totalCount) {
      break;
    }

    pageNo += 1;
  }

  const deactivated = await prisma.recruitmentPosting.updateMany({
    where: { lastSeenAt: { lt: syncStartedAt }, isActive: true },
    data: { isActive: false, isOngoing: false },
  });

  return {
    totalFetched,
    inserted,
    updated,
    deactivated: deactivated.count,
    pageCount,
    syncedAt: syncStartedAt.toISOString(),
  };
}

async function ensureRecruitmentsSynced(force = false): Promise<RecruitmentSyncResult | null> {
  const latest = await prisma.recruitmentPosting.findFirst({
    where: { isActive: true },
    orderBy: { lastSeenAt: "desc" },
    select: { lastSeenAt: true },
  });

  if (!force && latest) {
    const intervalMinutes = parsePositiveInt(
      process.env.RECRUITMENT_SYNC_INTERVAL_MINUTES,
      30
    );
    const intervalMs = intervalMinutes * 60 * 1000;
    const elapsed = Date.now() - latest.lastSeenAt.getTime();
    if (elapsed < intervalMs) {
      return null;
    }
  }

  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = performRecruitmentSync().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

function mapPostingToMatchItem(
  posting: {
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
    ncsCdNmList: string[];
    hireTypeNmList: string[];
    workRgnNmList: string[];
    acbgCondNmList: string[];
    raw: Prisma.JsonValue;
  }
): RecruitmentMatchItem {
  const raw =
    posting.raw && typeof posting.raw === "object" && !Array.isArray(posting.raw)
      ? (posting.raw as RecruitmentItem)
      : ({} as RecruitmentItem);

  return {
    ...raw,
    recrutPblntSn: posting.recrutPblntSn,
    instNm: posting.instNm,
    recrutPbancTtl: posting.recrutPbancTtl,
    recrutSeNm: posting.recrutSeNm,
    aplyQlfcCn: posting.aplyQlfcCn,
    prefCn: posting.prefCn,
    pbancBgngYmd: posting.pbancBgngYmd ?? undefined,
    pbancEndYmd: posting.pbancEndYmd ?? undefined,
    ongoingYn: posting.ongoingYn ?? undefined,
    ncsCdNmLst: posting.ncsCdNmLst,
    hireTypeNmLst: posting.hireTypeNmLst,
    workRgnNmLst: posting.workRgnNmLst,
    acbgCondNmLst: posting.acbgCondNmLst,
    matchScore: 0,
    matchReason: "",
    ncsCdNmList: posting.ncsCdNmList,
    hireTypeNmList: posting.hireTypeNmList,
    workRgnNmList: posting.workRgnNmList,
    acbgCondNmList: posting.acbgCondNmList,
  };
}

export async function matchRecruitments(
  resume: ResumeFormatResult,
  coverLetter: CoverLetterInput | undefined,
  offset = 0,
  limit = 10
) {
  const safeOffset = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 50) : 10;
  const minRows = safeOffset + safeLimit;
  const numOfRows = Math.max(50, Math.min(minRows, 500));
  const rawList = await fetchRecruitments(1, numOfRows);

  const filtered = rawList.filter((item) => {
    return (
      matchesEducation(item, resume) &&
      matchesCareer(item, resume) &&
      matchesRegion(item, resume)
    );
  });

  const profileSummary = buildProfileSummary(resume, coverLetter);

  const chunkSizeFromEnv = Number(process.env.RECRUITMENT_MATCH_BATCH_LIMIT ?? "20");
  const chunkSize =
    Number.isFinite(chunkSizeFromEnv) && chunkSizeFromEnv > 0 ? chunkSizeFromEnv : 20;
  const scoreTargetCount = Math.min(filtered.length, safeOffset + safeLimit);
  const scoreTargets = filtered.slice(0, scoreTargetCount);
  const scoreMap: Record<number, { matchScore: number; matchReason: string }> = {};

  for (let i = 0; i < scoreTargets.length; i += chunkSize) {
    const chunk = scoreTargets.slice(i, i + chunkSize);
    const chunkScoreMap = await scoreRecruitmentsBatch(chunk, profileSummary);
    Object.assign(scoreMap, chunkScoreMap);
  }

  // 점수가 계산된 항목만 추천 리스트에 포함한다.
  const scored: ScoredRecruitment[] = filtered
    .map((item) => {
      const score = scoreMap[item.recrutPblntSn];
      if (!score) return null;
      return {
        ...item,
        matchScore: score.matchScore,
        matchReason: score.matchReason,
      };
    })
    .filter((item): item is ScoredRecruitment => item !== null);

  scored.sort((a, b) => b.matchScore - a.matchScore);
  const slice = scored.slice(safeOffset, safeOffset + safeLimit);
  const detailedSlice = await Promise.all(
    slice.map(async (item) => {
      try {
        const detail = await fetchRecruitmentDetail(item.recrutPblntSn);
        return detail ? { ...item, ...detail } : item;
      } catch {
        return item;
      }
    })
  );
  const items: RecruitmentMatchItem[] = detailedSlice.map((item) => ({
    ...item,
    ncsCdNmList: splitCsv(item.ncsCdNmLst),
    hireTypeNmList: splitCsv(item.hireTypeNmLst),
    workRgnNmList: splitCsv(item.workRgnNmLst),
    acbgCondNmList: splitCsv(item.acbgCondNmLst),
  }));

  return {
    items,
    total: scored.length,
    nextOffset: safeOffset + items.length,
    hasMore: safeOffset + items.length < scored.length,
  };
}

export async function syncRecruitmentPostings(force = true) {
  return ensureRecruitmentsSynced(force);
}

export async function listRecruitments(
  filters: RecruitmentListFilters = {},
  offset = 0,
  limit = 10
): Promise<RecruitmentListResult> {
  const safeOffset = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 50) : 10;
  const where = buildPostingWhere(filters);

  const [total, postings] = await prisma.$transaction([
    prisma.recruitmentPosting.count({ where }),
    prisma.recruitmentPosting.findMany({
      where,
      skip: safeOffset,
      take: safeLimit,
      orderBy: [
        { updatedAt: "desc" },
        { pbancEndYmd: "asc" },
        { recrutPblntSn: "desc" },
      ],
      select: {
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
        ncsCdNmList: true,
        hireTypeNmList: true,
        workRgnNmList: true,
        acbgCondNmList: true,
        raw: true,
      },
    }),
  ]);

  const items = postings.map(mapPostingToMatchItem);
  const nextOffset = safeOffset + items.length;

  return {
    items,
    total,
    nextOffset,
    hasMore: nextOffset < total,
  };
}

export async function getRecruitmentFilterOptions(
  includeClosed = false
): Promise<RecruitmentFilterOptionsResult> {
  const postings = await prisma.recruitmentPosting.findMany({
    where: {
      isActive: true,
      ...(includeClosed ? {} : { isOngoing: true }),
    },
    select: {
      workRgnNmList: true,
      ncsCdNmList: true,
      recrutSeNm: true,
      acbgCondNmList: true,
      hireTypeNmList: true,
    },
  });

  const regions = new Set<string>();
  const fields = new Set<string>();
  const careerTypes = new Set<string>();
  const educationLevels = new Set<string>();
  const hireTypes = new Set<string>();

  for (const posting of postings) {
    for (const item of posting.workRgnNmList) regions.add(item);
    for (const item of posting.ncsCdNmList) fields.add(item);
    for (const item of splitCareerType(posting.recrutSeNm)) careerTypes.add(item);
    for (const item of posting.acbgCondNmList) educationLevels.add(item);
    for (const item of posting.hireTypeNmList) hireTypes.add(item);
  }

  return {
    regions: sortUnique(regions),
    fields: sortUnique(fields),
    careerTypes: sortUnique(careerTypes),
    educationLevels: sortUnique(educationLevels),
    hireTypes: sortUnique(hireTypes),
  };
}
