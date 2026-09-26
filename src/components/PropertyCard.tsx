import type { Property } from '../data/properties';
import type { Affordability } from '../lib/finance';
import { inrShort } from '../lib/format';

export const FIT_LABEL = { fits: 'Within budget', stretch: 'Stretch', over: 'Over budget' } as const;

interface Props {
  property: Property;
  fit: Affordability;
  shortlisted: boolean;
  onToggleShortlist: () => void;
  onOpen: () => void;
}

export function PropertyCard({ property: p, fit, shortlisted, onToggleShortlist, onOpen }: Props) {
  const { costs } = fit;
  return (
    <article className={`card fit-${fit.fit}`}>
      <button className="card-media" onClick={onOpen} aria-label={`View details of ${p.title}`}>
        <PropertyArt property={p} />
        <span className={`badge badge-${fit.fit}`}>{FIT_LABEL[fit.fit]}</span>
        <span className="status-chip">{p.status}</span>
      </button>
      <button
        className={`heart ${shortlisted ? 'on' : ''}`}
        onClick={onToggleShortlist}
        aria-pressed={shortlisted}
        aria-label={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
      >
        {shortlisted ? '♥' : '♡'}
      </button>
      <div className="card-body" onClick={onOpen}>
        <div className="row between baseline">
          <p className="price">{inrShort(p.price)}</p>
          <p className="muted small">₹{p.pricePerSqft.toLocaleString('en-IN')}/sq ft</p>
        </div>
        <h3>{p.title}</h3>
        <p className="muted small">{p.locality}, {p.city} · {p.developer}</p>
        <ul className="specs">
          <li>{p.bhk === 0 ? 'Studio' : `${p.bhk} BHK`}</li>
          <li>{p.carpetSqft.toLocaleString('en-IN')} sq ft carpet</li>
          <li>{p.possession === 'Immediate' ? 'Ready' : `Possession ${p.possession}`}</li>
        </ul>
        <div className="money-row">
          <div>
            <span className="muted small">EMI</span>
            <strong className={fit.emiOverComfort ? 'warn' : ''}>{inrShort(costs.monthlyEmi)}/mo</strong>
          </div>
          <div>
            <span className="muted small">Cash needed</span>
            <strong>{inrShort(costs.cashNeeded)}</strong>
          </div>
          <div>
            <span className="muted small">{fit.cashGap > 0 ? 'Shortfall' : 'Left over'}</span>
            <strong className={fit.cashGap > 0 ? 'neg' : 'pos'}>{inrShort(Math.abs(fit.cashGap))}</strong>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Lightweight generated illustration so the app needs no external images. */
export function PropertyArt({ property: p }: { property: Property }) {
  const h = p.hue;
  const tall = p.type === 'Apartment' || p.type === 'Studio';
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${p.type} illustration`}>
      <defs>
        <linearGradient id={`sky-${p.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`hsl(${h} 60% 82%)`} />
          <stop offset="1" stopColor={`hsl(${(h + 40) % 360} 55% 92%)`} />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#sky-${p.id})`} />
      <circle cx="260" cy="42" r="18" fill={`hsl(${(h + 180) % 360} 80% 88%)`} opacity=".9" />
      <rect y="150" width="320" height="30" fill={`hsl(${(h + 90) % 360} 30% 70%)`} />
      {tall ? (
        <g>
          <rect x="70" y="40" width="70" height="115" rx="3" fill={`hsl(${h} 25% 35%)`} />
          <rect x="150" y="20" width="80" height="135" rx="3" fill={`hsl(${h} 30% 45%)`} />
          <rect x="238" y="70" width="50" height="85" rx="3" fill={`hsl(${h} 20% 55%)`} />
          {Array.from({ length: 8 }).map((_, r) =>
            [0, 1, 2].map((c) => (
              <rect key={`${r}-${c}`} x={160 + c * 22} y={30 + r * 15} width="14" height="8" rx="1" fill="hsl(45 90% 85%)" opacity={(r + c + p.bhk) % 3 ? 0.9 : 0.35} />
            )),
          )}
          {Array.from({ length: 6 }).map((_, r) =>
            [0, 1].map((c) => (
              <rect key={`b${r}-${c}`} x={82 + c * 26} y={52 + r * 16} width="16" height="8" rx="1" fill="hsl(45 90% 85%)" opacity={(r + c) % 2 ? 0.85 : 0.4} />
            )),
          )}
        </g>
      ) : (
        <g>
          <rect x="100" y="90" width="120" height="65" fill={`hsl(${h} 30% 45%)`} />
          <polygon points="90,92 160,45 230,92" fill={`hsl(${(h + 20) % 360} 40% 30%)`} />
          <rect x="148" y="115" width="24" height="40" fill="hsl(30 40% 30%)" />
          <rect x="112" y="105" width="24" height="18" fill="hsl(45 90% 85%)" />
          <rect x="184" y="105" width="24" height="18" fill="hsl(45 90% 85%)" />
          <circle cx="60" cy="130" r="22" fill={`hsl(${(h + 100) % 360} 35% 45%)`} />
          <rect x="57" y="140" width="6" height="15" fill="hsl(30 30% 30%)" />
        </g>
      )}
    </svg>
  );
}
