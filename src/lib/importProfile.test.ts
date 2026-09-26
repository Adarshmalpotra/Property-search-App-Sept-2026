import { describe, expect, it } from 'vitest';
import { applyImport, parseAmount, parseMortgageOutput } from './importProfile';
import { DEFAULT_PROFILE, emi } from './finance';

describe('parseAmount', () => {
  it.each([
    ['₹85,00,000', 85_00_000],
    ['85 lakh', 85_00_000],
    ['85L', 85_00_000],
    ['1.2 Cr', 1_20_00_000],
    ['₹1.25 crore', 1_25_00_000],
    ['45k', 45_000],
  ])('%s', (raw, expected) => expect(parseAmount(raw)).toBeCloseTo(expected));
});

describe('parseMortgageOutput', () => {
  it('reads copied dashboard text', () => {
    const out = parseMortgageOutput(`Max Loan Eligibility: ₹92,00,000
Down Payment Available: ₹28 lakh
Interest Rate: 8.4%
Loan Tenure: 20 years
Monthly EMI: ₹79,300`);
    expect(out).toEqual({ eligibleLoan: 92_00_000, downPayment: 28_00_000, interestRate: 8.4, tenureYears: 20, monthlyEmi: 79_300 });
  });
  it('reads nested JSON with varied keys', () => {
    const out = parseMortgageOutput(JSON.stringify({ result: { maxLoanAmount: 7500000, emi: '₹65,000', interestRate: 0.0875, tenureMonths: 300, downPayment: '20 L' } }));
    expect(out).toEqual({ eligibleLoan: 75_00_000, monthlyEmi: 65_000, interestRate: 8.75, tenureYears: 25, downPayment: 20_00_000 });
  });
  it('reads a query string / link', () => {
    expect(parseMortgageOutput('https://example.com/?loan=9000000&down=2500000&rate=8.5&tenure=20')).toEqual({
      eligibleLoan: 90_00_000, downPayment: 25_00_000, interestRate: 8.5, tenureYears: 20,
    });
  });
  it('returns nothing for unrelated text', () => {
    expect(parseMortgageOutput('hello world')).toEqual({});
  });
});

describe('applyImport', () => {
  it('derives the loan from EMI when no loan amount is given', () => {
    const p = applyImport(DEFAULT_PROFILE, { monthlyEmi: 60_000, interestRate: 8.5, tenureYears: 20 });
    expect(emi(p.eligibleLoan, 8.5, 20)).toBeCloseTo(60_000, -1);
  });
});
