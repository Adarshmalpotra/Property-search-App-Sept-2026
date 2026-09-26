import { useState, type ReactNode } from 'react';
import { emi, maxBudget, type City, type MortgageProfile } from '../lib/finance';
import { applyImport, parseAmount, parseMortgageOutput } from '../lib/importProfile';
import { parseDashRow, type DashAssessment } from '../lib/mortgageDash';
import { inrShort } from '../lib/format';

interface Props {
  profile: MortgageProfile;
  onChange: (p: MortgageProfile) => void;
  source: string;
  onDashImport: (d: DashAssessment) => void;
  children?: ReactNode;
}

// Same shape as a row copied from the MortgageDash Output sheet (fictional applicant).
const SAMPLE = [
  '2026-09-26T16:30:30.271Z', 'Sample Applicant', '', '', 'MUMBAI SUBURBAN', 'Salaried',
  '210000', '2000000', '12000000', '26000', '56.67', 'FALSE', '79000', '8650000', '',
].join('\t');

export function ProfilePanel({ profile, onChange, source, onDashImport, children }: Props) {
  const [importOpen, setImportOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const doImport = () => {
    const row = parseDashRow(raw);
    if (row) {
      onDashImport(row);
      setMsg({ kind: 'ok', text: `Imported MortgageDash ${row.source} row for ${row.name || 'applicant'} (${row.location}).` });
      setImportOpen(false);
      return;
    }
    const parsed = parseMortgageOutput(raw);
    const keys = Object.keys(parsed);
    if (!keys.length) {
      setMsg({ kind: 'err', text: 'Not recognised. Copy a whole row (all columns) from the MortgageDash Input or Output sheet, or paste loan / EMI / down payment values.' });
      return;
    }
    onChange(applyImport(profile, parsed));
    setMsg({ kind: 'ok', text: `Imported ${keys.length} field${keys.length > 1 ? 's' : ''}: ${keys.map(label).join(', ')}.` });
    setImportOpen(false);
  };

  const set = (k: keyof MortgageProfile) => (v: number | undefined) => onChange({ ...profile, [k]: v });
  const emiAtLoan = emi(profile.eligibleLoan, profile.interestRate, profile.tenureYears);

  return (
    <section className="profile" aria-labelledby="profile-h">
      <div className="profile-head">
        <div>
          <p className="eyebrow">Step 1 · Your mortgage</p>
          <h2 id="profile-h">Loan profile</h2>
          <p className="muted small">Source: {source}</p>
        </div>
        <button className="btn btn-accent" onClick={() => setImportOpen((o) => !o)} aria-expanded={importOpen}>
          {importOpen ? 'Close' : 'Import from MortgageDash'}
        </button>
      </div>

      {importOpen && (
        <div className="import-box">
          <label htmlFor="import-raw" className="small">
            In the <a href="https://mortgagedash-ai.lovable.app" target="_blank" rel="noreferrer">MortgageDash</a> Output sheet (or Input sheet), select the applicant's row
            number, copy it (Ctrl/⌘+C) and paste it here. Labelled text, JSON or a link with query parameters also work.
          </label>
          <textarea id="import-raw" rows={4} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Paste a copied sheet row here…" />
          <div className="row gap">
            <button className="btn btn-primary" onClick={doImport} disabled={!raw.trim()}>Apply</button>
            <button className="btn btn-ghost" onClick={() => setRaw(SAMPLE)}>Use example</button>
          </div>
        </div>
      )}
      {msg && <p className={`notice ${msg.kind}`} role="status">{msg.text}</p>}
      {children}

      <div className="fields">
        <MoneyField label="Eligible loan" value={profile.eligibleLoan} onChange={(v) => set('eligibleLoan')(v ?? 0)} />
        <MoneyField label="Own funds (down payment)" value={profile.downPayment} onChange={(v) => set('downPayment')(v ?? 0)} />
        <NumField label="Interest rate" suffix="% p.a." step={0.05} value={profile.interestRate} onChange={(v) => set('interestRate')(v ?? 0)} />
        <NumField label="Tenure" suffix="years" step={1} value={profile.tenureYears} onChange={(v) => set('tenureYears')(v ?? 0)} />
        <MoneyField label="Comfortable EMI (optional)" value={profile.monthlyEmi} onChange={set('monthlyEmi')} optional />
      </div>

      <div className="budget-grid">
        {(['Mumbai', 'Bengaluru'] as City[]).map((c) => (
          <div key={c} className="budget-card">
            <p className="eyebrow">{c}</p>
            <p className="big">{inrShort(maxBudget(c, profile))}</p>
            <p className="muted small">max ready-to-move price after stamp duty, registration & fees</p>
          </div>
        ))}
        <div className="budget-card alt">
          <p className="eyebrow">EMI at full loan</p>
          <p className="big">{inrShort(emiAtLoan)}<span className="unit">/mo</span></p>
          <p className="muted small">{inrShort(profile.eligibleLoan)} · {profile.interestRate}% · {profile.tenureYears} yrs</p>
        </div>
      </div>
    </section>
  );
}

function label(k: string) {
  return (
    { eligibleLoan: 'loan', downPayment: 'down payment', interestRate: 'rate', tenureYears: 'tenure', monthlyEmi: 'EMI' } as Record<string, string>
  )[k] ?? k;
}

function MoneyField({ label, value, onChange, optional }: { label: string; value?: number; onChange: (v: number | undefined) => void; optional?: boolean }) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value ? value.toLocaleString('en-IN') : '');
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-wrap">
        <span className="prefix">₹</span>
        <input
          inputMode="decimal"
          value={shown}
          placeholder={optional ? 'e.g. 75,000' : ''}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            if (text !== null) {
              const v = parseAmount(text);
              onChange(v && v > 0 ? Math.round(v) : optional ? undefined : 0);
            }
            setText(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </div>
      <small className="muted">{value ? inrShort(value) : optional ? 'Flags homes above this EMI' : 'Accepts 85L, 1.2Cr…'}</small>
    </label>
  );
}

function NumField({ label, value, onChange, suffix, step }: { label: string; value: number; onChange: (v: number | undefined) => void; suffix: string; step: number }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-wrap">
        <input type="number" min={0} step={step} value={Number.isFinite(value) ? value : ''} onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
        <span className="suffix">{suffix}</span>
      </div>
    </label>
  );
}
