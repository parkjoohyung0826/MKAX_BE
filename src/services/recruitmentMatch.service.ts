import { genAI, GEMINI_MODEL } from "../common/gemini";
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

  const maxBatch = Number(process.env.RECRUITMENT_MATCH_BATCH_LIMIT ?? "20");
  const batchLimit = Number.isFinite(maxBatch) && maxBatch > 0 ? maxBatch : 20;
  const batchTargets = filtered.slice(0, batchLimit);
  const scoreMap = await scoreRecruitmentsBatch(batchTargets, profileSummary);
  const scored: ScoredRecruitment[] = filtered.map((item) => {
    const score = scoreMap[item.recrutPblntSn];
    return {
      ...item,
      matchScore: score?.matchScore ?? 0,
      matchReason:
        score?.matchReason ??
        "지원자 정보와 공고 간 연관성을 판단하기 어렵습니다.",
    };
  });

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

export async function listRecruitments(
  offset = 0,
  limit = 10
): Promise<RecruitmentListResult> {
  const safeOffset = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 50) : 10;
  const pageNo = Math.floor(safeOffset / safeLimit) + 1;

  const { items: rawItems, totalCount } = await fetchRecruitmentsWithMeta(
    pageNo,
    safeLimit
  );

  const detailed = await Promise.all(
    rawItems.map(async (item) => {
      try {
        const detail = await fetchRecruitmentDetail(item.recrutPblntSn);
        return detail ? { ...item, ...detail } : item;
      } catch {
        return item;
      }
    })
  );

  const items: RecruitmentMatchItem[] = detailed.map((item) => ({
    ...item,
    matchScore: 0,
    matchReason: "",
    ncsCdNmList: splitCsv(item.ncsCdNmLst),
    hireTypeNmList: splitCsv(item.hireTypeNmLst),
    workRgnNmList: splitCsv(item.workRgnNmLst),
    acbgCondNmList: splitCsv(item.acbgCondNmLst),
  }));

  const nextOffset = safeOffset + items.length;
  return {
    items,
    total: totalCount,
    nextOffset,
    hasMore: nextOffset < totalCount,
  };
}
