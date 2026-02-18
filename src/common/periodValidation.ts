function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

const OPEN_ENDED_PERIOD_TERMS = new Set([
  "현재",
  "재직중",
  "재학중",
  "진행중",
  "졸업예정",
  "ing",
]);

export type PeriodOrderIssue = {
  start: string;
  end: string;
  period: string;
};

function parseYearMonth(value: string): number | null {
  const raw = normalize(value);
  const match = /^(\d{4})[.\-/](\d{1,2})(?:[.\-/]\d{1,2})?$/.exec(raw);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (month < 1 || month > 12) return null;
  return year * 100 + month;
}

function isOpenEnded(value: string): boolean {
  const normalized = normalize(value).toLowerCase();
  return OPEN_ENDED_PERIOD_TERMS.has(normalized);
}

export function findPeriodOrderIssues(text: string): PeriodOrderIssue[] {
  const source = normalize(text);
  if (!source) return [];

  const issues: PeriodOrderIssue[] = [];
  const pattern =
    /(\d{4}[.\-/]\d{1,2}(?:[.\-/]\d{1,2})?)\s*(?:~|-|–|—)\s*(\d{4}[.\-/]\d{1,2}(?:[.\-/]\d{1,2})?|현재|재직중|재학중|진행중|졸업예정|ing)/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const startRaw = normalize(match[1]);
    const endRaw = normalize(match[2]);

    if (isOpenEnded(endRaw)) {
      continue;
    }

    const startValue = parseYearMonth(startRaw);
    const endValue = parseYearMonth(endRaw);
    if (startValue === null || endValue === null) {
      continue;
    }

    if (startValue >= endValue) {
      issues.push({
        start: startRaw,
        end: endRaw,
        period: `${startRaw} ~ ${endRaw}`,
      });
    }
  }

  return issues;
}
