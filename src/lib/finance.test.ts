import { describe, expect, it } from 'vitest';
import { assess, costBreakdown, emi, gstRate, loanFromEmi, ltvMaxLoan, maxBudget, type MortgageProfile } from './finance';
import { LAKH } from './format';

const profile: MortgageProfile = { eligibleLoan: 80 * LAKH, downPayment: 30 * LAKH, interestRate: 8.5, tenureYears: 20 };

describe('emi', () => {
  it('matches the standard amortisation formula', () => {
    // ₹50 L at 8.5% for 20 years ≈ ₹43,391
    expect(Math.round(emi(50 * LAKH, 8.5, 20))).toBe(43391);
  });
  it('handles zero interest', () => {
    expect(emi(12 * LAKH, 0, 10)).toBe(10_000);
  });
  it('round-trips through loanFromEmi', () => {
    expect(loanFromEmi(emi(75 * LAKH, 8.4, 25), 8.4, 25)).toBeCloseTo(75 * LAKH, 0);
  });
});

describe('ltvMaxLoan (RBI norms)', () => {
  it('allows 90% on small loans', () => expect(ltvMaxLoan(20 * LAKH)).toBe(18 * LAKH));
  it('caps at ₹30 L where 90% would cross the slab', () => expect(ltvMaxLoan(35 * LAKH)).toBe(30 * LAKH));
  it('allows 80% in the middle slab', () => expect(ltvMaxLoan(60 * LAKH)).toBe(48 * LAKH));
  it('allows 75% above ₹75 L loans', () => expect(ltvMaxLoan(2_00 * LAKH)).toBe(150 * LAKH));
});

describe('costBreakdown', () => {
  it('applies Mumbai stamp duty and capped registration', () => {
    const c = costBreakdown({ price: 1_00 * LAKH, city: 'Mumbai', status: 'Ready to move', carpetSqft: 800 }, profile);
    expect(c.stampDuty).toBe(6 * LAKH);
    expect(c.registration).toBe(30_000);
    expect(c.gst).toBe(0);
    expect(c.loan).toBe(75 * LAKH); // LTV-bound, below the ₹80 L eligibility
    expect(c.loanLimitedBy).toBe('ltv');
  });
  it('adds GST on under-construction homes', () => {
    expect(gstRate({ price: 90 * LAKH, city: 'Bengaluru', status: 'Under construction', carpetSqft: 1100 })).toBe(0.05);
    expect(gstRate({ price: 40 * LAKH, city: 'Bengaluru', status: 'Under construction', carpetSqft: 600 })).toBe(0.01);
  });
});

describe('assess / maxBudget', () => {
  it('max budget exactly exhausts own funds', () => {
    for (const city of ['Mumbai', 'Bengaluru'] as const) {
      const b = maxBudget(city, profile);
      const a = assess({ price: b, city, status: 'Ready to move', carpetSqft: 900 }, profile);
      expect(a.fit).toBe('fits');
      expect(-a.cashGap).toBeLessThan(20_000);
    }
  });
  it('classifies stretch and over', () => {
    const b = maxBudget('Mumbai', profile);
    expect(assess({ price: b * 1.03, city: 'Mumbai', status: 'Ready to move', carpetSqft: 900 }, profile).fit).toBe('stretch');
    expect(assess({ price: b * 1.5, city: 'Mumbai', status: 'Ready to move', carpetSqft: 900 }, profile).fit).toBe('over');
  });
  it('downgrades to stretch when EMI exceeds comfort', () => {
    const p = { ...profile, monthlyEmi: 20_000 };
    expect(assess({ price: 50 * LAKH, city: 'Bengaluru', status: 'Ready to move', carpetSqft: 900 }, p).fit).toBe('stretch');
  });
});
