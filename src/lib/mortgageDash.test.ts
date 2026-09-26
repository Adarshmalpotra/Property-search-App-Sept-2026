import { describe, expect, it } from 'vitest';
import { cityOf, maxEmiOf, parseDashRow, parseTsv, profileFromDash } from './mortgageDash';
import { assess, costBreakdown, DEFAULT_PROFILE, fullLoanNeeds, ltvMaxLoan, maxBudget } from './finance';
import { PROPERTIES } from '../data/properties';

// Values from a real MortgageDash run (row 28); name and contact details replaced.
const OUTPUT_ROW = ['2026-09-26T16:30:30.271Z', 'Test Applicant', 'test@example.com', '910000000000', 'MUMBAI SUBURBAN', 'Salaried',
  '210000', '2000000', '12000000', '26000', '56.67', 'FALSE', '79000', '8650000', 'Add a co-applicant or increase the down payment'].join('\t');
const INPUT_ROW = ['Test Applicant', 'test@example.com', '910000000000', 'Salaried', 'MUMBAI SUBURBAN', '210000', '26000', '12000000', '2000000'].join('\t');

describe('parseDashRow', () => {
  it('reads an Output sheet row', () => {
    expect(parseDashRow(OUTPUT_ROW)).toEqual({
      source: 'output', name: 'Test Applicant', location: 'MUMBAI SUBURBAN', employment: 'Salaried',
      monthlyIncome: 210000, downPayment: 2000000, propertyValue: 12000000, existingEmi: 26000,
      foirPct: 56.67, eligible: false, maxEmi: 79000, maxLoan: 8650000,
      recommendation: 'Add a co-applicant or increase the down payment',
    });
  });

  it('reads an Input sheet row (different column order)', () => {
    expect(parseDashRow(INPUT_ROW)).toMatchObject({
      source: 'input', monthlyIncome: 210000, existingEmi: 26000, propertyValue: 12000000, downPayment: 2000000, location: 'MUMBAI SUBURBAN',
    });
  });

  it('skips a pasted header row and handles quoted multi-line cells', () => {
    const header = ['Timestamp', 'Name', 'Email', 'Phone', 'Location', 'Employment', 'Income', 'Down', 'Value', 'EMIs', 'FOIR', 'Eligible', 'Max EMI', 'Max loan', 'Reco'].join('\t');
    const multiline = OUTPUT_ROW.replace('Add a co-applicant or increase the down payment', '"Line one\nline ""two"""');
    const d = parseDashRow(`${header}\n${multiline}`);
    expect(d?.maxLoan).toBe(8650000);
    expect(d?.recommendation).toBe('Line one\nline "two"');
  });

  it('rejects unrelated text', () => {
    expect(parseDashRow('hello\tworld')).toBeUndefined();
    expect(parseTsv('a\tb\n\nc')).toEqual([['a', 'b'], ['c']]);
  });
});

describe('MortgageDash → search profile', () => {
  it('derives the same max EMI MortgageDash reports (50% FOIR)', () => {
    const input = parseDashRow(INPUT_ROW)!;
    const output = parseDashRow(OUTPUT_ROW)!;
    expect(maxEmiOf(input)).toBe(79000);
    expect(maxEmiOf(input)).toBe(output.maxEmi);
  });

  it('uses the Output sheet loan and down payment as-is', () => {
    const p = profileFromDash(parseDashRow(OUTPUT_ROW)!, DEFAULT_PROFILE);
    expect(p).toMatchObject({ eligibleLoan: 8650000, downPayment: 2000000, monthlyEmi: 79000 });
  });

  it('agrees with MortgageDash that the ₹1.2 Cr request is out of reach', () => {
    const p = profileFromDash(parseDashRow(OUTPUT_ROW)!, DEFAULT_PROFILE);
    expect(assess({ price: 12000000, city: 'Mumbai', status: 'Ready to move', carpetSqft: 700 }, p).fit).toBe('over');
    expect(maxBudget('Mumbai', p)).toBeLessThan(12000000);
  });

  it('shows the down payment, not the loan, is the binding limit', () => {
    const p = profileFromDash(parseDashRow(OUTPUT_ROW)!, DEFAULT_PROFILE);
    const budget = maxBudget('Mumbai', p);
    expect(costBreakdown({ price: budget, city: 'Mumbai', status: 'Ready to move', carpetSqft: 700 }, p).loan).toBeLessThan(8650000);
    const full = fullLoanNeeds('Mumbai', p);
    expect(ltvMaxLoan(full.price)).toBeGreaterThanOrEqual(8650000);
    expect(ltvMaxLoan(full.price - 20_000)).toBeLessThan(8650000);
    expect(full.cashNeeded).toBeGreaterThan(p.downPayment);
  });

  it('maps the location to a city and a district that has listings', () => {
    expect(cityOf('MUMBAI SUBURBAN')).toBe('Mumbai');
    expect(cityOf('Bengaluru Urban')).toBe('Bengaluru');
    expect(PROPERTIES.some((x) => x.district === 'Mumbai Suburban')).toBe(true);
  });
});
