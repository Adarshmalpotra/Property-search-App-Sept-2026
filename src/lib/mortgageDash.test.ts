import { describe, expect, it } from 'vitest';
import { cityOf, maxEmiOf, parseDashRow, parseTsv, profileFromDash } from './mortgageDash';
import { assess, costBreakdown, DEFAULT_PROFILE, fullLoanNeeds, ltvMaxLoan, maxBudget } from './finance';
import { PROPERTIES } from '../data/properties';

// Figures from real MortgageDash Output rows; names, contact details and free text replaced.
const OUTPUT_ROW = [
  '2026-09-26T16:30:30.271Z', 'Test Applicant', 'test@example.com', '910000000000', 'MUMBAI SUBURBAN', 'Salaried',
  '210000', '2000000', '12000000', '26000', '56.67', 'FALSE', '79000', '8650000',
  'Bank analysis text', 'None (FOIR exceeds limits)', 'High',
].join('\t');
// Sheets quotes cells containing line breaks when a row is copied.
const BLR_ROW = [
  '2026-09-12T03:30:06.142Z', 'Second Applicant', 'x@example.com', '910000000001', 'Bengaluru', 'Salaried',
  '130000', '1500000', '8000000', '0', '44.62', 'TRUE', '65000', '7200000',
  'Bank analysis text', '"SBI, HDFC,\nICICI, Axis\nBank, Kotak\nMahindra Bank,\nBank of Baroda"', 'Low',
].join('\t');
const INPUT_ROW = ['Test Applicant', 'test@example.com', '910000000000', 'Salaried', 'MUMBAI SUBURBAN', '210000', '26000', '12000000', '2000000'].join('\t');

describe('parseDashRow', () => {
  it('reads an Output sheet row', () => {
    expect(parseDashRow(OUTPUT_ROW)).toEqual({
      source: 'output', name: 'Test Applicant', location: 'MUMBAI SUBURBAN', employment: 'Salaried',
      monthlyIncome: 210000, downPayment: 2000000, propertyValue: 12000000, existingEmi: 26000,
      foirPct: 56.67, eligible: false, maxEmi: 79000, maxLoan: 8650000,
      analysis: 'Bank analysis text', banks: [], banksNote: 'None (FOIR exceeds limits)', risk: 'High',
    });
  });

  it('reads the approving-bank list and risk from an eligible row', () => {
    const d = parseDashRow(BLR_ROW)!;
    expect(d).toMatchObject({ location: 'Bengaluru', eligible: true, foirPct: 44.62, maxEmi: 65000, maxLoan: 7200000, risk: 'Low' });
    expect(d.banks).toEqual(['SBI', 'HDFC', 'ICICI', 'Axis Bank', 'Kotak Mahindra Bank', 'Bank of Baroda']);
  });

  it('reads an Input sheet row (different column order)', () => {
    expect(parseDashRow(INPUT_ROW)).toMatchObject({
      source: 'input', monthlyIncome: 210000, existingEmi: 26000, propertyValue: 12000000, downPayment: 2000000, location: 'MUMBAI SUBURBAN',
    });
  });

  it('skips a pasted header row and handles quoted multi-line cells', () => {
    const header = ['Timestamp', 'Name', 'Email', 'Phone', 'Location', 'Employment', 'Income', 'Down', 'Value', 'EMIs', 'FOIR', 'Eligible', 'Max EMI', 'Max loan', 'Analysis', 'Banks', 'Risk'].join('\t');
    const multiline = OUTPUT_ROW.replace('Bank analysis text', '"Line one\nline ""two"""');
    const d = parseDashRow(`${header}\n${multiline}`);
    expect(d?.maxLoan).toBe(8650000);
    expect(d?.analysis).toBe('Line one\nline "two"');
    expect(d?.risk).toBe('High');
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
    const blr = parseDashRow(BLR_ROW)!;
    expect(0.5 * blr.monthlyIncome - blr.existingEmi).toBe(blr.maxEmi);
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

  it('flags when an approved loan still leaves the purchase short of cash', () => {
    const d = parseDashRow(BLR_ROW)!;
    const p = profileFromDash(d, DEFAULT_PROFILE);
    const need = costBreakdown({ price: d.propertyValue, city: 'Bengaluru', status: 'Ready to move', carpetSqft: 1000 }, p).cashNeeded;
    expect(d.eligible).toBe(true);
    expect(need).toBeGreaterThan(d.downPayment);
  });

  it('maps the location to a city and a district that has listings', () => {
    expect(cityOf('MUMBAI SUBURBAN')).toBe('Mumbai');
    expect(cityOf('Bengaluru')).toBe('Bengaluru');
    expect(PROPERTIES.some((x) => x.district === 'Mumbai Suburban')).toBe(true);
  });
});
