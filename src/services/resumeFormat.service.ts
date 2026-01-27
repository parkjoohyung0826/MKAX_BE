import { genAI, GEMINI_MODEL } from "../common/gemini";

export type ResumeFormatInput = {
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
`;

  const userPrompt = `input: ${JSON.stringify(input)}`;

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
