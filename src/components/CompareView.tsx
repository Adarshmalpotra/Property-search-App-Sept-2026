import { useEffect, useRef, type ReactNode } from 'react';
import type { Property } from '../data/properties';
import type { Affordability } from '../lib/finance';
import { inrShort } from '../lib/format';
import { FIT_LABEL } from './PropertyCard';

interface Props {
  items: { property: Property; fit: Affordability }[];
  onRemove: (id: string) => void;
  onClose: () => void;
}

export function CompareView({ items, onRemove, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const rows: [string, (x: Props['items'][number]) => ReactNode][] = [
    ['Location', ({ property: p }) => `${p.locality}, ${p.city}`],
    ['Price', ({ property: p }) => inrShort(p.price)],
    ['Configuration', ({ property: p }) => `${p.bhk === 0 ? 'Studio' : `${p.bhk} BHK`} ${p.type}`],
    ['Carpet area', ({ property: p }) => `${p.carpetSqft.toLocaleString('en-IN')} sq ft`],
    ['₹ / sq ft', ({ property: p }) => `₹${p.pricePerSqft.toLocaleString('en-IN')}`],
    ['Status', ({ property: p }) => (p.possession === 'Immediate' ? 'Ready' : `Possession ${p.possession}`)],
    ['Loan', ({ fit }) => inrShort(fit.costs.loan)],
    ['EMI', ({ fit }) => `${inrShort(fit.costs.monthlyEmi)}/mo`],
    ['Cash needed', ({ fit }) => inrShort(fit.costs.cashNeeded)],
    ['Shortfall / left over', ({ fit }) => <span className={fit.cashGap > 0 ? 'neg' : 'pos'}>{fit.cashGap > 0 ? '−' : '+'}{inrShort(Math.abs(fit.cashGap))}</span>],
    ['Verdict', ({ fit }) => <span className={`badge inline badge-${fit.fit}`}>{FIT_LABEL[fit.fit]}</span>],
    ['Developer', ({ property: p }) => p.developer],
  ];

  return (
    <dialog ref={ref} className="modal wide" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="cmp-h">
      <div className="modal-inner compare">
        <button className="close" onClick={onClose} aria-label="Close">×</button>
        <h2 id="cmp-h">Compare shortlist</h2>
        {items.length === 0 ? (
          <p className="muted">Your shortlist is empty. Tap ♡ on a listing to add it.</p>
        ) : (
          <div className="table-scroll">
            <table className="compare-table">
              <thead>
                <tr>
                  <th />
                  {items.map(({ property: p }) => (
                    <th key={p.id}>
                      {p.title}
                      <button className="link small" onClick={() => onRemove(p.id)}>Remove</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, render]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {items.map((x) => <td key={x.property.id}>{render(x)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </dialog>
  );
}
