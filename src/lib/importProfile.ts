import { CRORE, LAKH } from './format';
import { loanFromEmi, type MortgageProfile } from './finance';

/**
 * Reads a MortgageDash result in whatever shape the user brings it:
 *  - JSON (copied from the dashboard or an API response)
 *  - Plain text copied from the results screen ("Max loan eligibility: ₹85,00,000")
 *  - URL query string (?loan=8500000&down=2500000&rate=8.4&tenure=20&emi=73000)
 * Returns only the fields it could recognise.
 */
export function parseMortgageOutput(input: string): Partial<MortgageProfile> {
  const text = input.trim();
  if (!text) return {};
  if (text.startsWith('{')) {
    try {
      return fromRecord(flatten(JSON.parse(text)));
    } catch {
      /* fall through to text parsing */
    }
  }
  if (/^[?]?[\w.]+=/.test(text) || /^https?:\/\//.test(text)) {
    const qs = text.includes('?') ? text.slice(text.indexOf('?') + 1) : text;
    const rec: Record<string, string> = {};
    new URLSearchParams(qs).forEach((v, k) => (rec[k] = v));
    const parsed = fromRecord(rec);
    if (Object.keys(parsed).length) return parsed;
  }
  return fromText(text);
}

type Field = keyof MortgageProfile;

// Order matters: more specific patterns first so "loan tenure" is not read as a loan amount.
const KEY_PATTERNS: [Field, RegExp][] = [
  ['tenureYears', /tenure|term|years|duration|period/i],
  ['interestRate', /rate|interest|roi/i],
  ['monthlyEmi', /emi|monthly\s*(payment|instal)/i],
  ['downPayment', /down|own\s*contribution|own\s*funds|savings|margin/i],
  ['eligibleLoan', /loan|eligib|sanction|borrow|principal/i],
];

function fieldForKey(key: string): Field | undefined {
  return KEY_PATTERNS.find(([, re]) => re.test(key))?.[0];
}

function flatten(obj: unknown, prefix = '', out: Record<string, unknown> = {}): Record<string, unknown> {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out[prefix] = obj;
  }
  return out;
}

function fromRecord(rec: Record<string, unknown>): Partial<MortgageProfile> {
  const out: Partial<MortgageProfile> = {};
  for (const [key, raw] of Object.entries(rec)) {
    // Use the leaf key first ("result.maxLoan" → "maxLoan"), then the full path.
    const field = fieldForKey(key.split('.').pop() ?? key) ?? fieldForKey(key);
    if (!field || out[field] !== undefined) continue;
    const value = typeof raw === 'number' ? raw : parseAmount(String(raw ?? ''));
    if (value !== undefined) out[field] = normalise(field, value, `${key} ${raw}`);
  }
  return out;
}

function fromText(text: string): Partial<MortgageProfile> {
  const out: Partial<MortgageProfile> = {};
  for (const line of text.split(/\n|;|\|/)) {
    const m = line.match(/^\s*([^:=\-–₹\d]+?)\s*[:=\-–]?\s*(₹?\s*[\d.,]+\s*(?:%|lakhs?|lacs?|l\b|crores?|cr\b|k\b|years?|yrs?|months?)?)/i);
    if (!m) continue;
    const field = fieldForKey(m[1]);
    if (!field || out[field] !== undefined) continue;
    const value = parseAmount(m[2]);
    if (value !== undefined) out[field] = normalise(field, value, `${m[1]} ${m[2]}`);
  }
  return out;
}

/** "₹1.2 Cr" → 12000000, "85 lakh" → 8500000, "8,50,000" → 850000, "45k" → 45000 */
export function parseAmount(raw: string): number | undefined {
  const m = raw.replace(/,/g, '').match(/(-?\d+(?:\.\d+)?)\s*(crores?|cr|lakhs?|lacs?|l|k)?\b/i);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  const unit = (m[2] ?? '').toLowerCase();
  if (unit.startsWith('c')) return n * CRORE;
  if (unit.startsWith('l')) return n * LAKH;
  if (unit === 'k') return n * 1000;
  return n;
}

/** `context` is the label/key plus the raw value, so "tenureMonths: 300" and "300 months" both convert. */
function normalise(field: Field, value: number, context: string): number {
  if (field === 'tenureYears' && (/month/i.test(context) || value > 50)) return value / 12;
  if (field === 'interestRate' && value > 0 && value < 1) return value * 100; // 0.085 → 8.5
  return value;
}

/** Merge an import onto the current profile; derive the loan from EMI if only EMI was given. */
export function applyImport(current: MortgageProfile, imported: Partial<MortgageProfile>): MortgageProfile {
  const next = { ...current, ...imported };
  if (imported.eligibleLoan === undefined && imported.monthlyEmi) {
    next.eligibleLoan = Math.round(loanFromEmi(imported.monthlyEmi, next.interestRate, next.tenureYears));
  }
  return next;
}
