import { genAI, GEMINI_MODEL } from "../common/gemini";
import { ResumeFormatResult } from "./resumeFormat.service";

type CoverLetterInput = {
  growthProcess?: string;
  strengthsAndWeaknesses?: string;
  keyExperience?: string;
  motivation?: string;
};

type RecruitmentItem = {
  recrutPblntSn: number;
  instNm?: string;
  recrutPbancTtl?: string;
  recrutSeNm?: string;
  pbancBgngYmd?: string;
  pbancEndYmd?: string;
  acbgCondNmLst?: string;
  recrutNope?: number;
  hireTypeNmLst?: string;
  ncsCdNmLst?: string;
  workRgnNmLst?: string;
  aplyQlfcCn?: string;
  prefCn?: string;
  scrnprcdrMthdExpln?: string;
  srcUrl?: string;
};

type ScoredRecruitment = RecruitmentItem & {
  matchScore: number;
  matchReason: string;
};

export type RecruitmentMatchItem = Omit<ScoredRecruitment, "ncsCdNmLst"> & {
  ncsCdNmList: string[];
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

async function scoreRecruitment(
  job: RecruitmentItem,
  profileSummary: string
): Promise<{ matchScore: number; matchReason: string }> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const systemPrompt = `
너는 채용 공고와 지원자 정보를 비교해 적합도를 평가하는 AI다.
아래 정보를 보고 JSON 형식으로만 출력해.

{
  "matchScore": number,
  "matchReason": string
}

규칙:
- matchScore는 0~100 사이 정수.
- matchReason은 1~2문장으로 간단히.
- 과장하지 말고 입력 정보에 근거해서 판단.
`;

  const userPrompt = `지원자 정보:\n${profileSummary}\n\n공고 정보:\n기관: ${normalize(
    job.instNm
  )}\n제목: ${normalize(job.recrutPbancTtl)}\n채용구분: ${normalize(
    job.recrutSeNm
  )}\n지역: ${normalize(job.workRgnNmLst)}\n지원자격: ${truncateText(
    normalize(job.aplyQlfcCn),
    500
  )}\n우대사항: ${truncateText(normalize(job.prefCn), 300)}\n`;

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
    const score = Number(parsed?.matchScore);
    return {
      matchScore: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0,
      matchReason: normalize(parsed?.matchReason),
    };
  } catch {
    return {
      matchScore: 0,
      matchReason: "지원자 정보와 공고 간 연관성을 판단하기 어렵습니다.",
    };
  }
}

export async function fetchRecruitments(pageNo = 1, numOfRows = 50) {
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
  return (data?.result ?? []) as RecruitmentItem[];
}

export async function matchRecruitments(
  resume: ResumeFormatResult,
  coverLetter: CoverLetterInput | undefined,
  offset = 0,
  limit = 10
) {
  const rawList = await fetchRecruitments(1, 50);

  const filtered = rawList.filter((item) => {
    return (
      matchesEducation(item, resume) &&
      matchesCareer(item, resume) &&
      matchesRegion(item, resume)
    );
  });

  const profileSummary = buildProfileSummary(resume, coverLetter);

  const scored: ScoredRecruitment[] = [];
  for (const item of filtered) {
    const score = await scoreRecruitment(item, profileSummary);
    scored.push({
      ...item,
      matchScore: score.matchScore,
      matchReason: score.matchReason,
    });
  }

  scored.sort((a, b) => b.matchScore - a.matchScore);
  const slice = scored.slice(offset, offset + limit);
  const items: RecruitmentMatchItem[] = slice.map((item) => ({
    ...item,
    ncsCdNmList: normalize(item.ncsCdNmLst)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  }));

  return {
    items,
    total: scored.length,
    nextOffset: offset + items.length,
    hasMore: offset + items.length < scored.length,
  };
}
