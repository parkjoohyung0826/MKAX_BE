import { normalize } from "../common/textProcessing";
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

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
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
