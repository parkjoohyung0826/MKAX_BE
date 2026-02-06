import { genAI, GEMINI_MODEL } from "../common/gemini";

export type RecommendProfileResult = {
  name: string;
  englishName: string;
  dateOfBirth: string;
  email: string;
  phoneNumber: string;
  emergencyContact: string;
  address: string;
  desiredJob: string;
  missingInfo: string;
  isComplete: boolean;
};

type ProfileFields = Omit<RecommendProfileResult, "missingInfo" | "isComplete">;

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

function isValidEnglishName(value: string): boolean {
  return /^[A-Za-z][A-Za-z\s.'-]*$/.test(value);
}

function isValidDate(value: string): boolean {
  const match = /^(\d{4})[.\-](\d{2})[.\-](\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

export async function recommendProfileFromDescription(
  description: string
): Promise<RecommendProfileResult> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const systemPrompt = `
너는 이력서 기본 프로필 정보를 정리하는 AI야.
사용자 입력(description)을 분석해서 아래 JSON 형식으로만 출력해. (추가 텍스트 절대 금지)

{
  "name": string,
  "englishName": string,
  "dateOfBirth": string,
  "email": string,
  "phoneNumber": string,
  "emergencyContact": string,
  "address": string,
  "desiredJob": string,
  "missingInfo": string,
  "isComplete": boolean
}

규칙:
- 각 필드는 입력에서 추출 가능한 정보만 채우고, 없으면 빈 문자열("").
- dateOfBirth는 "YYYY.MM.DD" 형식을 우선 사용.
- email은 표준 이메일 형식.
- phoneNumber/emergencyContact는 숫자와 하이픈을 포함한 전화번호 형식.
- missingInfo는 아래 순서를 따르는 단일 질문 문장으로 작성해.
  순서: name → englishName → dateOfBirth → email → phoneNumber → emergencyContact → address → desiredJob
- 한 번에 하나의 정보만 요청한다. (모든 정보를 한꺼번에 요청 금지)
- 입력이 유효하지 않거나 형식이 잘못된 경우, 해당 항목을 다시 입력해달라고 질문한다.
- missingInfo는 친절하고 자연스러운 한국어 문장으로 작성한다.
- 모든 항목이 유효하면 missingInfo는 빈 문자열("")이고 isComplete는 true.
- 정보가 부족하면 isComplete는 false.
`;

  const userPrompt = `description: ${description}`;

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
      name: "",
      englishName: "",
      dateOfBirth: "",
      email: "",
      phoneNumber: "",
      emergencyContact: "",
      address: "",
      desiredJob: "",
      missingInfo: "이름을 알려주실 수 있을까요?",
      isComplete: false,
    };
  }

  const llmMissingInfo = normalize(parsed.missingInfo);

  const resultData: RecommendProfileResult = {
    name: normalize(parsed.name),
    englishName: normalize(parsed.englishName),
    dateOfBirth: normalize(parsed.dateOfBirth),
    email: normalize(parsed.email),
    phoneNumber: normalize(parsed.phoneNumber),
    emergencyContact: normalize(parsed.emergencyContact),
    address: normalize(parsed.address),
    desiredJob: normalize(parsed.desiredJob),
    missingInfo: "",
    isComplete: false,
  };

  const order: Array<{
    key: keyof ProfileFields;
    labelMissing: string;
    labelInvalid?: string;
    validate?: (value: string) => boolean;
  }> = [
    {
      key: "name",
      labelMissing: "이름을 알려주실 수 있을까요?",
      validate: (v) => v.length >= 2,
    },
    {
      key: "englishName",
      labelMissing: "영문 이름도 알려주실 수 있나요?",
      labelInvalid: "영문 이름 형식이 조금 어색해요. 다시 입력해주실래요?",
      validate: isValidEnglishName,
    },
    {
      key: "dateOfBirth",
      labelMissing: "생년월일을 알려주실 수 있을까요?",
      labelInvalid: "생년월일은 YYYY.MM.DD 형식으로 입력해주세요.",
      validate: isValidDate,
    },
    {
      key: "email",
      labelMissing: "이메일 주소를 알려주세요.",
      labelInvalid: "이메일 형식이 맞지 않아요. 다시 입력해주세요.",
      validate: isValidEmail,
    },
    {
      key: "phoneNumber",
      labelMissing: "전화번호를 알려주세요.",
      labelInvalid: "전화번호 형식이 올바르지 않아요. 다시 입력해주세요.",
      validate: isValidPhone,
    },
    {
      key: "emergencyContact",
      labelMissing: "비상 연락처도 입력해주실 수 있을까요?",
      labelInvalid: "비상 연락처 형식이 맞지 않아요. 다시 입력해주세요.",
      validate: isValidPhone,
    },
    {
      key: "address",
      labelMissing: "주소를 알려주세요.",
      validate: (v) => v.length >= 5,
    },
    {
      key: "desiredJob",
      labelMissing: "희망 직무를 알려주세요.",
      validate: (v) => v.length >= 2,
    },
  ];

  for (const item of order) {
    const value = resultData[item.key];
    if (value.length === 0) {
      resultData.missingInfo = llmMissingInfo || item.labelMissing;
      resultData.isComplete = false;
      return resultData;
    }
    if (item.validate && !item.validate(value)) {
      resultData[item.key] = "";
      resultData.missingInfo = llmMissingInfo || item.labelInvalid ?? item.labelMissing;
      resultData.isComplete = false;
      return resultData;
    }
  }

  resultData.isComplete = true;
  return resultData;
}
