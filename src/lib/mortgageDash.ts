import { loanFromEmi, type City, type MortgageProfile } from './finance';
import { parseAmount } from './importProfile';

/**
 * MortgageDash ("India Mortgage Underwriting AI Challenge DDS") writes one row per
 * applicant to two Google Sheets. Copying a row from Sheets yields tab-separated cells.
 *
 * Input sheet (9 columns):
 *   A Name | B Email | C Phone | D Employment | E Location |
 *   F Monthly income | G Existing EMIs | H Property value | I Down payment
 *
 * Output sheet (17 columns — note the numeric columns are re-ordered):
 *   A Timestamp | B Name | C Email | D Phone | E Location | F Employment |
 *   G Monthly income | H Down payment | I Property value | J Existing EMIs |
 *   K FOIR % on the requested loan | L Eligible (TRUE/FALSE) |
 *   M Max affordable EMI | N Max eligible loan | O Bank-by-bank analysis |
 *   P Likely approving banks ("SBI, HDFC, …" or "None (…)") | Q Risk level
 *
 * Email and phone are intentionally not read — the search needs no contact data.
 */
export interface DashAssessment {
  source: 'input' | 'output';
  name: string;
  employment: string;
  location: string;
  monthlyIncome: number;
  existingEmi: number;
  propertyValue: number;
  downPayment: number;
  /** Output sheet only. */
  foirPct?: number;
  eligible?: boolean;
  maxEmi?: number;
  maxLoan?: number;
  analysis?: string;
  /** Banks MortgageDash expects to approve; empty when it says "None". */
  banks?: string[];
  /** Raw text of column P, e.g. "None (FOIR exceeds limits)". */
  banksNote?: string;
  risk?: string;
}

/** Share of income a lender lets go to all EMIs. Matches MortgageDash: 50% × 2,10,000 − 26,000 = 79,000. */
export const FOIR_LIMIT = 0.5;

export function parseDashRow(text: string): DashAssessment | undefined {
  // Last data row wins, so pasting a header row plus a data row also works.
  const rows = parseTsv(text).filter((r) => r.length >= 9);
  for (let i = rows.length - 1; i >= 0; i--) {
    const parsed = fromCells(rows[i].map((c) => c.trim()));
    if (parsed) return parsed;
  }
  return undefined;
}

function fromCells(c: string[]): DashAssessment | undefined {
  const num = (s: string | undefined) => {
    if (s === undefined || !/\d/.test(s)) return undefined;
    return parseAmount(s);
  };
  const isTimestamp = /^\d{4}-\d{2}-\d{2}[T\s]\d{1,2}:\d{2}/.test(c[0]);

  if (isTimestamp && c.length >= 14) {
    const [income, down, value, existing] = [num(c[6]), num(c[7]), num(c[8]), num(c[9])];
    if ([income, down, value, existing].some((v) => v === undefined)) return undefined;
    const eligibleCell = c[11]?.toUpperCase();
    return {
      source: 'output',
      name: c[1],
      location: c[4],
      employment: c[5],
      monthlyIncome: income!,
      downPayment: down!,
      propertyValue: value!,
      existingEmi: existing!,
      foirPct: num(c[10]),
      eligible: eligibleCell === 'TRUE' ? true : eligibleCell === 'FALSE' ? false : undefined,
      maxEmi: num(c[12]),
      maxLoan: num(c[13]),
      analysis: c[14] || undefined,
      ...parseBanks(c[15]),
      risk: c[16] || undefined,
    };
  }

  if (!isTimestamp) {
    const [income, existing, value, down] = [num(c[5]), num(c[6]), num(c[7]), num(c[8])];
    if ([income, existing, value, down].some((v) => v === undefined)) return undefined;
    return {
      source: 'input',
      name: c[0],
      employment: c[3],
      location: c[4],
      monthlyIncome: income!,
      existingEmi: existing!,
      propertyValue: value!,
      downPayment: down!,
    };
  }
  return undefined;
}

function parseBanks(cell: string | undefined): Pick<DashAssessment, 'banks' | 'banksNote'> {
  if (!cell) return {};
  if (/^none\b/i.test(cell)) return { banks: [], banksNote: cell };
  return { banks: cell.replace(/\s+/g, ' ').split(',').map((b) => b.trim()).filter(Boolean), banksNote: cell };
}

/** Minimal TSV reader that understands Sheets' quoting of cells containing tabs or newlines. */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === '\t') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((r) => r.some((x) => x.trim()));
}

/** Max EMI MortgageDash allows; derived the same way when only the Input row is available. */
export function maxEmiOf(a: DashAssessment): number {
  return a.maxEmi ?? Math.max(0, a.monthlyIncome * FOIR_LIMIT - a.existingEmi);
}

/**
 * Turn an assessment into the search profile. The Output sheet's max loan is used as-is;
 * from an Input row the loan is what the max EMI services at the current rate and tenure.
 */
export function profileFromDash(a: DashAssessment, current: MortgageProfile): MortgageProfile {
  const monthlyEmi = maxEmiOf(a);
  return {
    ...current,
    eligibleLoan: a.maxLoan ?? Math.round(loanFromEmi(monthlyEmi, current.interestRate, current.tenureYears)),
    downPayment: a.downPayment,
    monthlyEmi,
  };
}

export function cityOf(location: string): City | undefined {
  if (/mumbai|thane|navi|mira|bhayandar|raigad|palghar/i.test(location)) return 'Mumbai';
  if (/beng|bang/i.test(location)) return 'Bengaluru';
  return undefined;
}
