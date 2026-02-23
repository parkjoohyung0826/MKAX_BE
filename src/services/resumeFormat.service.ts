import { genAI, GEMINI_MODEL } from "../common/gemini";

export type ResumeFormatInput = {
  resumeType?: "basic" | "senior";
  name: string;
  englishName: string;
  dateOfBirth: string;
  email: string;
  phoneNumber: string;
  emergencyContact: string;
  address: string;
  photo: string;
  desiredJob: string;
  education: string;
  workExperience: string;
  coreCompetencies: string;
  certifications: string;
};

export type ResumeEducationItem = {
  schoolName: string;
  major: string;
  period: string;
  graduationStatus: string;
  details: string;
};

export type ResumeWorkExperienceItem = {
  companyName: string;
  period: string;
  mainTask: string;
  leavingReason: string;
};

export type ResumeCertificationItem = {
  certificationName: string;
  period: string;
  institution: string;
};

export type ResumeCoreCompetencyItem = {
  fullDescription: string;
  period: string;
  courseName: string;
  institution: string;
};

export type ResumeFormatResult = {
  name: string;
  englishName: string;
  dateOfBirth: string;
  email: string;
  phoneNumber: string;
  emergencyContact: string;
  address: string;
  photo: string;
  desiredJob: string;
  education: ResumeEducationItem[];
  workExperience: ResumeWorkExperienceItem[];
  coreCompetencies: ResumeCoreCompetencyItem[];
  certifications: ResumeCertificationItem[];
};

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

export async function formatResumeData(
  input: ResumeFormatInput
): Promise<ResumeFormatResult> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const resumeType = input.resumeType === "senior" ? "senior" : "basic";

  const systemPrompt = `
너는 이력서 포맷 정리 도우미야.
사용자가 제공한 데이터를 이력서에 맞게 구조화해서 아래 JSON 형식으로만 출력해. (추가 텍스트 절대 금지)

{
  "name": string,
  "englishName": string,
  "dateOfBirth": string,
  "email": string,
  "phoneNumber": string,
  "emergencyContact": string,
  "address": string,
  "photo": string,
  "desiredJob": string,
  "education": [
    {
      "schoolName": string,
      "major": string,
      "period": string,
      "graduationStatus": string,
      "details": string
    }
  ],
  "workExperience": [
    {
      "companyName": string,
      "period": string,
      "mainTask": string,
      "leavingReason": string
    }
  ],
  "coreCompetencies": [
    {
      "fullDescription": string,
      "period": string,
      "courseName": string,
      "institution": string
    }
  ],
  "certifications": [
    {
      "certificationName": string,
      "period": string,
      "institution": string
    }
  ]
}

규칙:
- 입력에 있는 정보만 사용하고, 추정/과장 금지.
- education/workExperience/coreCompetencies/certifications는 입력 문자열을 기준으로 항목별로 분리한다.
- 항목이 없으면 빈 배열로 출력한다.
- 각 필드 값이 없으면 빈 문자열("")로 둔다.
- resumeType이 "basic"이면 기존 일반형 이력서 기준으로 정리한다.
- resumeType이 "senior"이면 아래 기준을 반드시 반영한다.
  1) coreCompetencies는 "직업 훈련 및 교육 이수" 관점으로 정리
     - 최근 직무 교육/훈련 중심으로 항목 분리
     - 예: 요양보호사 과정, 신임경비 교육, 안전보건 교육, 지자체/복지관/내일배움카드 교육
  2) certifications는 "면허/자격증 및 사용 가능 기기" 관점으로 정리
     - 운전면허, 국가/민간 자격증, 장비/디지털 활용 가능 여부를 포함
     - 어학 점수 중심 정보는 senior에서는 핵심이 아니므로 후순위 처리
  3) education/workExperience 구조는 basic과 동일하게 유지
`;

  const userPrompt = `resumeType: ${resumeType}\ninput: ${JSON.stringify(input)}`;

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
    return {
      name: normalize(input.name),
      englishName: normalize(input.englishName),
      dateOfBirth: normalize(input.dateOfBirth),
      email: normalize(input.email),
      phoneNumber: normalize(input.phoneNumber),
      emergencyContact: normalize(input.emergencyContact),
      address: normalize(input.address),
      photo: normalize(input.photo),
      desiredJob: normalize(input.desiredJob),
      education: [],
      workExperience: [],
      coreCompetencies: [],
      certifications: [],
    };
  }

  return {
    name: normalize(parsed.name ?? input.name),
    englishName: normalize(parsed.englishName ?? input.englishName),
    dateOfBirth: normalize(parsed.dateOfBirth ?? input.dateOfBirth),
    email: normalize(parsed.email ?? input.email),
    phoneNumber: normalize(parsed.phoneNumber ?? input.phoneNumber),
    emergencyContact: normalize(parsed.emergencyContact ?? input.emergencyContact),
    address: normalize(parsed.address ?? input.address),
    photo: normalize(parsed.photo ?? input.photo),
    desiredJob: normalize(parsed.desiredJob ?? input.desiredJob),
    education: Array.isArray(parsed.education)
      ? parsed.education.map((item: any) => ({
          schoolName: normalize(item?.schoolName),
          major: normalize(item?.major),
          period: normalize(item?.period),
          graduationStatus: normalize(item?.graduationStatus),
          details: normalize(item?.details),
        }))
      : [],
    workExperience: Array.isArray(parsed.workExperience)
      ? parsed.workExperience.map((item: any) => ({
          companyName: normalize(item?.companyName),
          period: normalize(item?.period),
          mainTask: normalize(item?.mainTask),
          leavingReason: normalize(item?.leavingReason),
        }))
      : [],
    coreCompetencies: Array.isArray(parsed.coreCompetencies)
      ? parsed.coreCompetencies.map((item: any) => ({
          fullDescription: normalize(item?.fullDescription),
          period: normalize(item?.period),
          courseName: normalize(item?.courseName),
          institution: normalize(item?.institution),
        }))
      : [],
    certifications: Array.isArray(parsed.certifications)
      ? parsed.certifications.map((item: any) => ({
          certificationName: normalize(item?.certificationName),
          period: normalize(item?.period),
          institution: normalize(item?.institution),
        }))
      : [],
  };
}

export async function formatResumeFromExtractedText(
  resumeText: string
): Promise<ResumeFormatResult> {
  const text = normalize(resumeText);
  if (!text) {
    return {
      name: "",
      englishName: "",
      dateOfBirth: "",
      email: "",
      phoneNumber: "",
      emergencyContact: "",
      address: "",
      photo: "",
      desiredJob: "",
      education: [],
      workExperience: [],
      coreCompetencies: [],
      certifications: [],
    };
  }

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const systemPrompt = `
너는 OCR로 추출된 이력서 텍스트를 채용 매칭용 구조화 JSON으로 변환하는 도우미야.
출력은 반드시 JSON만 허용한다.

{
  "name": string,
  "englishName": string,
  "dateOfBirth": string,
  "email": string,
  "phoneNumber": string,
  "emergencyContact": string,
  "address": string,
  "photo": string,
  "desiredJob": string,
  "education": [
    {
      "schoolName": string,
      "major": string,
      "period": string,
      "graduationStatus": string,
      "details": string
    }
  ],
  "workExperience": [
    {
      "companyName": string,
      "period": string,
      "mainTask": string,
      "leavingReason": string
    }
  ],
  "coreCompetencies": [
    {
      "fullDescription": string,
      "period": string,
      "courseName": string,
      "institution": string
    }
  ],
  "certifications": [
    {
      "certificationName": string,
      "period": string,
      "institution": string
    }
  ]
}

규칙:
- OCR 오탈자를 감안하되 과도한 추정 금지.
- 없는 정보는 빈 문자열("") 또는 빈 배열([])로 둔다.
- 채용 매칭에 중요한 desiredJob, address, workExperience, certifications를 우선 추출한다.
- photo는 항상 빈 문자열("")로 둔다.
`;

  try {
    const result = await model.generateContent([
      systemPrompt,
      `resumeText: ${JSON.stringify(text)}`,
    ]);
    const raw = result.response.text();
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    return {
      name: normalize(parsed.name),
      englishName: normalize(parsed.englishName),
      dateOfBirth: normalize(parsed.dateOfBirth),
      email: normalize(parsed.email),
      phoneNumber: normalize(parsed.phoneNumber),
      emergencyContact: normalize(parsed.emergencyContact),
      address: normalize(parsed.address),
      photo: "",
      desiredJob: normalize(parsed.desiredJob),
      education: Array.isArray(parsed.education)
        ? parsed.education.map((item: any) => ({
            schoolName: normalize(item?.schoolName),
            major: normalize(item?.major),
            period: normalize(item?.period),
            graduationStatus: normalize(item?.graduationStatus),
            details: normalize(item?.details),
          }))
        : [],
      workExperience: Array.isArray(parsed.workExperience)
        ? parsed.workExperience.map((item: any) => ({
            companyName: normalize(item?.companyName),
            period: normalize(item?.period),
            mainTask: normalize(item?.mainTask),
            leavingReason: normalize(item?.leavingReason),
          }))
        : [],
      coreCompetencies: Array.isArray(parsed.coreCompetencies)
        ? parsed.coreCompetencies.map((item: any) => ({
            fullDescription: normalize(item?.fullDescription),
            period: normalize(item?.period),
            courseName: normalize(item?.courseName),
            institution: normalize(item?.institution),
          }))
        : [],
      certifications: Array.isArray(parsed.certifications)
        ? parsed.certifications.map((item: any) => ({
            certificationName: normalize(item?.certificationName),
            period: normalize(item?.period),
            institution: normalize(item?.institution),
          }))
        : [],
    };
  } catch {
    return {
      name: "",
      englishName: "",
      dateOfBirth: "",
      email: "",
      phoneNumber: "",
      emergencyContact: "",
      address: "",
      photo: "",
      desiredJob: "",
      education: [],
      workExperience: [],
      coreCompetencies: [],
      certifications: [],
    };
  }
}
