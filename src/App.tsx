import { useEffect, useMemo, useState } from 'react';
import { DISTRICTS_BY_CITY, LOCALITIES_BY_CITY, PROPERTIES, type PropertyType } from './data/properties';
import { assess, costBreakdown, DEFAULT_PROFILE, fullLoanNeeds, maxBudget, type City, type Fit, type MortgageProfile, type Status } from './lib/finance';
import { applyImport, parseMortgageOutput } from './lib/importProfile';
import { inrShort } from './lib/format';
import { cityOf, profileFromDash, type DashAssessment } from './lib/mortgageDash';
import { ProfilePanel } from './components/ProfilePanel';
import { PropertyCard } from './components/PropertyCard';
import { PropertyDetail } from './components/PropertyDetail';
import { CompareView } from './components/CompareView';
import { DashSummary } from './components/DashSummary';

type Sort = 'best' | 'price-asc' | 'price-desc' | 'psf-asc' | 'area-desc' | 'emi-asc';
type FitFilter = 'all' | 'fits' | 'fits-stretch';

interface Filters {
  city: City | 'All';
  district: string;
  locality: string;
  bhk: number[];
  type: PropertyType | 'All';
  status: Status | 'All';
  fit: FitFilter;
  query: string;
  sort: Sort;
}

const DEFAULT_FILTERS: Filters = { city: 'All', district: '', locality: '', bhk: [], type: 'All', status: 'All', fit: 'fits-stretch', query: '', sort: 'best' };
const FIT_RANK: Record<Fit, number> = { fits: 0, stretch: 1, over: 2 };
const PAGE = 24;

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? { ...fallback, ...JSON.parse(v) } : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

/** A MortgageDash link like ?loan=9200000&down=2800000&rate=8.4&tenure=20 seeds the profile. */
function initialProfile(): { profile: MortgageProfile; source: string } {
  const stored = load<MortgageProfile>('homefit.profile', DEFAULT_PROFILE);
  const fromUrl = parseMortgageOutput(window.location.search.replace(/^\?/, ''));
  if (Object.keys(fromUrl).length) return { profile: applyImport(stored, fromUrl), source: 'MortgageDash link' };
  return { profile: stored, source: stored === DEFAULT_PROFILE ? 'example values — import yours' : 'saved on this device' };
}

export default function App() {
  const [{ profile, source }, setProfileState] = useState(initialProfile);
  const [filters, setFilters] = useState<Filters>(() => load('homefit.filters', DEFAULT_FILTERS));
  const [shortlist, setShortlist] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('homefit.shortlist') ?? '[]');
    } catch {
      return [];
    }
  });
  const [dash, setDash] = useState<DashAssessment | undefined>(() => {
    try {
      return JSON.parse(localStorage.getItem('homefit.dash') ?? 'null') ?? undefined;
    } catch {
      return undefined;
    }
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => save('homefit.profile', profile), [profile]);
  useEffect(() => save('homefit.filters', filters), [filters]);
  useEffect(() => save('homefit.shortlist', shortlist), [shortlist]);
  useEffect(() => save('homefit.dash', dash ?? null), [dash]);
  useEffect(() => setLimit(PAGE), [filters, profile]);

  const setProfile = (p: MortgageProfile) => setProfileState({ profile: p, source: 'edited manually' });
  /** A MortgageDash sheet row sets the loan profile and narrows the search to the applicant's city and district. */
  const importDash = (d: DashAssessment) => {
    setDash(d);
    setProfileState({ profile: profileFromDash(d, profile), source: `MortgageDash ${d.source} sheet` });
    const city = cityOf(d.location);
    const district = city ? (DISTRICTS_BY_CITY[city].find((x) => x.toLowerCase() === d.location.trim().toLowerCase()) ?? '') : '';
    setFilters((f) => ({ ...f, city: city ?? 'All', district, locality: '' }));
  };
  const update = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const toggleShortlist = (id: string) => setShortlist((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const assessed = useMemo(() => PROPERTIES.map((p) => ({ property: p, fit: assess(p, profile) })), [profile]);
  const byId = useMemo(() => new Map(assessed.map((x) => [x.property.id, x])), [assessed]);

  const results = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const list = assessed.filter(({ property: p, fit }) => {
      if (filters.city !== 'All' && p.city !== filters.city) return false;
      if (filters.district && p.district !== filters.district) return false;
      if (filters.locality && p.locality !== filters.locality) return false;
      if (filters.bhk.length && !filters.bhk.includes(Math.min(p.bhk, 4))) return false;
      if (filters.type !== 'All' && p.type !== filters.type) return false;
      if (filters.status !== 'All' && p.status !== filters.status) return false;
      if (filters.fit === 'fits' && fit.fit !== 'fits') return false;
      if (filters.fit === 'fits-stretch' && fit.fit === 'over') return false;
      if (q && !`${p.title} ${p.locality} ${p.district} ${p.developer} ${p.zone}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const cmp: Record<Sort, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
      // Best fit: within budget first, then the most home for the money (largest carpet area).
      best: (a, b) => FIT_RANK[a.fit.fit] - FIT_RANK[b.fit.fit] || b.property.carpetSqft - a.property.carpetSqft,
      'price-asc': (a, b) => a.property.price - b.property.price,
      'price-desc': (a, b) => b.property.price - a.property.price,
      'psf-asc': (a, b) => a.property.pricePerSqft - b.property.pricePerSqft,
      'area-desc': (a, b) => b.property.carpetSqft - a.property.carpetSqft,
      'emi-asc': (a, b) => a.fit.costs.monthlyEmi - b.fit.costs.monthlyEmi,
    };
    return list.sort(cmp[filters.sort]);
  }, [assessed, filters]);

  const counts = useMemo(() => {
    const c = { fits: 0, stretch: 0, over: 0 };
    for (const x of assessed) if (filters.city === 'All' || x.property.city === filters.city) c[x.fit.fit]++;
    return c;
  }, [assessed, filters.city]);

  const cityLocalities = filters.city === 'All' ? [...LOCALITIES_BY_CITY.Mumbai, ...LOCALITIES_BY_CITY.Bengaluru] : LOCALITIES_BY_CITY[filters.city];
  const localities = filters.district ? cityLocalities.filter((l) => PROPERTIES.some((p) => p.locality === l && p.district === filters.district)) : cityLocalities;
  const area = filters.district || (filters.city === 'All' ? 'Mumbai and Bengaluru' : filters.city);
  const matchingInArea = assessed.filter(
    ({ property: p, fit }) =>
      fit.fit === 'fits' && (filters.city === 'All' || p.city === filters.city) && (!filters.district || p.district === filters.district),
  ).length;
  const dashCity = dash ? cityOf(dash.location) : undefined;
  const dashBudget = useMemo(() => {
    if (!dashCity) return undefined;
    const maxPrice = maxBudget(dashCity, profile);
    const full = fullLoanNeeds(dashCity, profile);
    const loanUsed = costBreakdown({ price: maxPrice, city: dashCity, status: 'Ready to move', carpetSqft: 1000 }, profile).loan;
    return { city: dashCity, maxPrice, loanUsed, fullLoanPrice: full.price, fullLoanCash: full.cashNeeded };
  }, [dashCity, profile]);
  const requestedCash = dash && dashCity
    ? costBreakdown({ price: dash.propertyValue, city: dashCity, status: 'Ready to move', carpetSqft: 1000 }, profile).cashNeeded
    : undefined;
  const fitsInCity = filters.city === 'All' ? 0 : assessed.filter(({ property: p, fit }) => fit.fit === 'fits' && p.city === filters.city).length;
  const elsewhere = filters.district && filters.city !== 'All' && fitsInCity > matchingInArea
    ? { count: fitsInCity, label: `all of ${filters.city}`, onShow: () => setFilters((f) => ({ ...f, district: '', locality: '' })) }
    : undefined;
  const open = openId ? byId.get(openId) : undefined;
  const shortlistItems = shortlist.map((id) => byId.get(id)).filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <>
      <header className="topbar">
        <div className="wrap row between">
          <a className="brand" href="./">
            <span className="logo" aria-hidden>⌂</span> HomeFit
            <span className="muted small hide-sm">Mumbai · Bengaluru</span>
          </a>
          <button className="btn btn-ghost" onClick={() => setComparing(true)}>
            ♥ Shortlist <span className="pill">{shortlist.length}</span>
          </button>
        </div>
      </header>

      <main className="wrap">
        <section className="hero">
          <h1>Homes you can actually buy, <em>priced against your loan.</em></h1>
          <p className="lead">
            Bring your eligibility from MortgageDash. We add stamp duty, registration, GST and RBI loan-to-value limits to every listing in
            Mumbai and Bengaluru, then show what fits.
          </p>
        </section>

        <ProfilePanel profile={profile} onChange={setProfile} source={source} onDashImport={importDash}>
          {dash && <DashSummary dash={dash} matching={matchingInArea} area={area} budget={dashBudget} requestedCash={requestedCash} elsewhere={elsewhere} onClear={() => setDash(undefined)} />}
        </ProfilePanel>

        <section className="search" aria-labelledby="search-h">
          <div className="row between wrap-sm">
            <div>
              <p className="eyebrow">Step 2 · Find a home</p>
              <h2 id="search-h">Properties</h2>
            </div>
            <div className="fit-summary" aria-label="Affordability summary">
              <span className="dot fits" /> {counts.fits} within budget
              <span className="dot stretch" /> {counts.stretch} stretch
              <span className="dot over" /> {counts.over} over
            </div>
          </div>

          <div className="city-tabs" role="tablist">
            {(['All', 'Mumbai', 'Bengaluru'] as const).map((c) => (
              <button key={c} role="tab" aria-selected={filters.city === c} className={filters.city === c ? 'active' : ''}
                onClick={() => setFilters((f) => ({ ...f, city: c, district: '', locality: '' }))}>
                {c === 'All' ? 'Both cities' : c}
                {c !== 'All' && <span className="muted small"> up to {inrShort(maxBudget(c, profile))}</span>}
              </button>
            ))}
          </div>

          <div className="filters">
            <input className="grow" type="search" placeholder="Search locality, developer, project…" value={filters.query} onChange={(e) => update('query', e.target.value)} aria-label="Search" />
            {filters.city !== 'All' && (
              <select value={filters.district} onChange={(e) => setFilters((f) => ({ ...f, district: e.target.value, locality: '' }))} aria-label="District">
                <option value="">All districts</option>
                {DISTRICTS_BY_CITY[filters.city].map((d) => <option key={d}>{d}</option>)}
              </select>
            )}
            <select value={filters.locality} onChange={(e) => update('locality', e.target.value)} aria-label="Locality">
              <option value="">All localities</option>
              {localities.map((l) => <option key={l}>{l}</option>)}
            </select>
            <div className="chips" role="group" aria-label="Bedrooms">
              {[0, 1, 2, 3, 4].map((b) => (
                <button key={b} className={filters.bhk.includes(b) ? 'chip on' : 'chip'} aria-pressed={filters.bhk.includes(b)}
                  onClick={() => update('bhk', filters.bhk.includes(b) ? filters.bhk.filter((x) => x !== b) : [...filters.bhk, b])}>
                  {b === 0 ? 'Studio' : b === 4 ? '4+ BHK' : `${b} BHK`}
                </button>
              ))}
            </div>
            <select value={filters.type} onChange={(e) => update('type', e.target.value as Filters['type'])} aria-label="Property type">
              <option value="All">Any type</option>
              <option>Apartment</option><option>Villa</option><option>Row house</option><option>Studio</option>
            </select>
            <select value={filters.status} onChange={(e) => update('status', e.target.value as Filters['status'])} aria-label="Construction status">
              <option value="All">Any status</option>
              <option>Ready to move</option><option>Under construction</option>
            </select>
            <select value={filters.fit} onChange={(e) => update('fit', e.target.value as FitFilter)} aria-label="Affordability">
              <option value="fits-stretch">Within budget + stretch</option>
              <option value="fits">Within budget only</option>
              <option value="all">Show everything</option>
            </select>
            <select value={filters.sort} onChange={(e) => update('sort', e.target.value as Sort)} aria-label="Sort">
              <option value="best">Best fit</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="emi-asc">Lowest EMI</option>
              <option value="psf-asc">Lowest ₹/sq ft</option>
              <option value="area-desc">Largest area</option>
            </select>
            <button className="btn btn-ghost small" onClick={() => setFilters(DEFAULT_FILTERS)}>Reset</button>
          </div>

          <p className="muted small results-count">{results.length} of {PROPERTIES.length} listings</p>

          {results.length === 0 ? (
            <div className="empty">
              <p><strong>No homes match.</strong></p>
              <p className="muted">Try another locality, fewer bedrooms, or choose “Show everything” to see what's just out of reach.</p>
              <button className="btn btn-primary" onClick={() => update('fit', 'all')}>Show everything</button>
            </div>
          ) : (
            <div className="grid">
              {results.slice(0, limit).map(({ property, fit }) => (
                <PropertyCard key={property.id} property={property} fit={fit}
                  shortlisted={shortlist.includes(property.id)}
                  onToggleShortlist={() => toggleShortlist(property.id)}
                  onOpen={() => setOpenId(property.id)} />
              ))}
            </div>
          )}
          {results.length > limit && (
            <div className="center">
              <button className="btn btn-ghost" onClick={() => setLimit((l) => l + PAGE)}>Show more ({results.length - limit} left)</button>
            </div>
          )}
        </section>
      </main>

      <footer className="wrap footer muted small">
        <p>
          Listings are sample data generated from indicative 2026 locality rates, not live inventory. Stamp duty, registration, GST and
          RBI LTV norms are applied as indicative estimates — confirm with your lender and the state registration office before buying.
        </p>
      </footer>

      {shortlist.length > 0 && !comparing && !open && (
        <button className="compare-fab btn btn-primary" onClick={() => setComparing(true)}>
          Compare {shortlist.length} shortlisted
        </button>
      )}

      {open && (
        <PropertyDetail property={open.property} fit={open.fit} profile={profile}
          shortlisted={shortlist.includes(open.property.id)}
          onToggleShortlist={() => toggleShortlist(open.property.id)}
          onClose={() => setOpenId(null)} />
      )}
      {comparing && <CompareView items={shortlistItems} onRemove={toggleShortlist} onClose={() => setComparing(false)} />}
    </>
  );
}
