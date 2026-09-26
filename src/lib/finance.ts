import { LAKH } from './format';

export type City = 'Mumbai' | 'Bengaluru';
export type Status = 'Ready to move' | 'Under construction';

/** Loan profile — what MortgageDash (or the user) tells us the buyer can borrow and bring. */
export interface MortgageProfile {
  /** Maximum home loan the lender will sanction (₹). */
  eligibleLoan: number;
  /** Own funds available for down payment + purchase costs (₹). */
  downPayment: number;
  /** Annual interest rate, e.g. 8.5 for 8.5%. */
  interestRate: number;
  /** Loan tenure in years. */
  tenureYears: number;
  /** Optional: monthly EMI the buyer is comfortable with (₹). */
  monthlyEmi?: number;
}

export const DEFAULT_PROFILE: MortgageProfile = {
  eligibleLoan: 90 * LAKH,
  downPayment: 30 * LAKH,
  interestRate: 8.5,
  tenureYears: 20,
};

/** Monthly EMI for principal `p` at annual `rate` % over `years`. */
export function emi(p: number, rate: number, years: number): number {
  if (p <= 0 || years <= 0) return 0;
  const n = Math.round(years * 12);
  const r = rate / 12 / 100;
  if (r === 0) return p / n;
  const f = Math.pow(1 + r, n);
  return (p * r * f) / (f - 1);
}

/** Principal that a given EMI can service — inverse of `emi`. */
export function loanFromEmi(monthly: number, rate: number, years: number): number {
  if (monthly <= 0 || years <= 0) return 0;
  const n = Math.round(years * 12);
  const r = rate / 12 / 100;
  if (r === 0) return monthly * n;
  const f = Math.pow(1 + r, n);
  return (monthly * (f - 1)) / (r * f);
}

/**
 * Highest loan RBI loan-to-value norms allow on a property of `price`:
 * loans up to ₹30 L → 90%, ₹30–75 L → 80%, above ₹75 L → 75%.
 */
export function ltvMaxLoan(price: number): number {
  return Math.max(Math.min(0.9 * price, 30 * LAKH), Math.min(0.8 * price, 75 * LAKH), 0.75 * price);
}

/**
 * Indicative one-time costs by city. Rates change — buyers should verify with
 * the state registration department before transacting.
 */
export const CITY_COSTS: Record<City, { stampDuty: number; registrationRate: number; registrationCap: number; note: string }> = {
  Mumbai: {
    stampDuty: 0.06, // 5% stamp duty + 1% metro cess (Maharashtra, municipal limits)
    registrationRate: 0.01,
    registrationCap: 30_000,
    note: 'Maharashtra: 5% stamp duty + 1% metro cess; registration 1% capped at ₹30,000.',
  },
  Bengaluru: {
    stampDuty: 0.056, // 5% stamp duty + surcharge & cess (Karnataka, properties above ₹45 L)
    registrationRate: 0.01,
    registrationCap: Infinity,
    note: 'Karnataka: ~5.6% stamp duty incl. surcharge & cess; registration ~1%.',
  },
};

/** Lender processing fee assumed on the sanctioned loan. */
export const PROCESSING_FEE = 0.005;

export interface CostBreakdown {
  price: number;
  loan: number;
  downPaymentPortion: number;
  stampDuty: number;
  registration: number;
  gst: number;
  processingFee: number;
  /** Everything the buyer pays from own pocket. */
  cashNeeded: number;
  monthlyEmi: number;
  totalInterest: number;
  /** Which constraint limited the loan. */
  loanLimitedBy: 'eligibility' | 'ltv';
}

export interface PropertyCostInput {
  price: number;
  city: City;
  status: Status;
  carpetSqft: number;
}

/** GST: 5% on under-construction homes, 1% for "affordable" ones (≤ ₹45 L and ≤ 60 m² carpet in metros). Ready homes carry none. */
export function gstRate(p: PropertyCostInput): number {
  if (p.status !== 'Under construction') return 0;
  const affordable = p.price <= 45 * LAKH && p.carpetSqft <= 646;
  return affordable ? 0.01 : 0.05;
}

export function costBreakdown(p: PropertyCostInput, profile: MortgageProfile): CostBreakdown {
  const c = CITY_COSTS[p.city];
  const ltv = ltvMaxLoan(p.price);
  const loan = Math.max(0, Math.min(profile.eligibleLoan, ltv, p.price));
  const stampDuty = p.price * c.stampDuty;
  const registration = Math.min(p.price * c.registrationRate, c.registrationCap);
  const gst = p.price * gstRate(p);
  const processingFee = loan * PROCESSING_FEE;
  const downPaymentPortion = p.price - loan;
  const monthly = emi(loan, profile.interestRate, profile.tenureYears);
  return {
    price: p.price,
    loan,
    downPaymentPortion,
    stampDuty,
    registration,
    gst,
    processingFee,
    cashNeeded: downPaymentPortion + stampDuty + registration + gst + processingFee,
    monthlyEmi: monthly,
    totalInterest: monthly * Math.round(profile.tenureYears * 12) - loan,
    loanLimitedBy: profile.eligibleLoan <= ltv ? 'eligibility' : 'ltv',
  };
}

export type Fit = 'fits' | 'stretch' | 'over';

export interface Affordability {
  fit: Fit;
  /** Positive = shortfall in own funds, negative = cash left over. */
  cashGap: number;
  /** EMI exceeds the buyer's stated comfort EMI. */
  emiOverComfort: boolean;
  costs: CostBreakdown;
}

/** Stretch band: shortfall up to 10% of own funds or 3% of price, whichever is larger. */
export function assess(p: PropertyCostInput, profile: MortgageProfile): Affordability {
  const costs = costBreakdown(p, profile);
  const cashGap = costs.cashNeeded - profile.downPayment;
  const emiOverComfort = !!profile.monthlyEmi && costs.monthlyEmi > profile.monthlyEmi * 1.001;
  const stretchBand = Math.max(profile.downPayment * 0.1, p.price * 0.03);
  let fit: Fit = cashGap <= 0 ? 'fits' : cashGap <= stretchBand ? 'stretch' : 'over';
  if (fit === 'fits' && emiOverComfort) fit = 'stretch';
  return { fit, cashGap, emiOverComfort, costs };
}

/** Highest ready-to-move price the profile can buy in a city (binary search on cash needed). */
export function maxBudget(city: City, profile: MortgageProfile): number {
  let lo = 0;
  let hi = profile.eligibleLoan + profile.downPayment;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const { cashNeeded } = costBreakdown({ price: mid, city, status: 'Ready to move', carpetSqft: 1000 }, profile);
    if (cashNeeded <= profile.downPayment) lo = mid;
    else hi = mid;
  }
  return Math.floor(lo / 10_000) * 10_000;
}

/**
 * What it takes to use the whole eligible loan in a city: the cheapest ready home on which
 * RBI LTV norms allow that loan, and the own funds that home needs.
 */
export function fullLoanNeeds(city: City, profile: MortgageProfile): { price: number; cashNeeded: number } {
  let lo = profile.eligibleLoan;
  let hi = profile.eligibleLoan * 2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (ltvMaxLoan(mid) >= profile.eligibleLoan) hi = mid;
    else lo = mid;
  }
  const price = Math.ceil(hi / 10_000) * 10_000;
  return { price, cashNeeded: costBreakdown({ price, city, status: 'Ready to move', carpetSqft: 1000 }, profile).cashNeeded };
}
