export const LAKH = 1_00_000;
export const CRORE = 1_00_00_000;

/** Compact Indian notation: ₹85 L, ₹1.25 Cr, ₹45,000 */
export function inrShort(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const sign = value < 0 ? '−' : '';
  const v = Math.abs(value);
  if (v >= CRORE) return `${sign}₹${trim(v / CRORE)} Cr`;
  if (v >= LAKH) return `${sign}₹${trim(v / LAKH)} L`;
  return `${sign}₹${Math.round(v).toLocaleString('en-IN')}`;
}

/** Full Indian grouping: ₹1,25,00,000 */
export function inr(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const sign = value < 0 ? '−' : '';
  return `${sign}₹${Math.round(Math.abs(value)).toLocaleString('en-IN')}`;
}

function trim(n: number): string {
  return n >= 100 ? n.toFixed(0) : n.toFixed(2).replace(/\.?0+$/, '');
}

export function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits).replace(/\.0+$/, '')}%`;
}
