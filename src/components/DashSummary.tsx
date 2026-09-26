import { FOIR_LIMIT, maxEmiOf, type DashAssessment } from '../lib/mortgageDash';
import { inr, inrShort } from '../lib/format';

interface Props {
  dash: DashAssessment;
  matching: number;
  area: string;
  /** Highest affordable price in the applicant's city, and what using the full loan would take. */
  budget?: { city: string; maxPrice: number; loanUsed: number; fullLoanPrice: number; fullLoanCash: number };
  /** Own funds our cost model says the requested property needs (incl. stamp duty etc.). */
  requestedCash?: number;
  elsewhere?: { count: number; label: string; onShow: () => void };
  onClear: () => void;
}

export function DashSummary({ dash, matching, area, budget, requestedCash, elsewhere, onClear }: Props) {
  const maxEmi = maxEmiOf(dash);
  const eligible = dash.eligible;
  return (
    <div className="dash">
      <div className="row between wrap-sm">
        <div>
          <p className="eyebrow">MortgageDash assessment · {dash.source === 'output' ? 'Output sheet' : 'Input sheet (EMI limit derived)'}</p>
          <h3 className="dash-name">
            {dash.name || 'Applicant'} <span className="muted small">· {titleCase(dash.employment)} · {titleCase(dash.location)}</span>
          </h3>
        </div>
        <div className="row gap">
          {dash.risk && <span className={`badge inline risk-${riskClass(dash.risk)}`}>Risk: {dash.risk}</span>}
          <button className="btn btn-ghost small" onClick={onClear}>Clear</button>
        </div>
      </div>

      <dl className="dash-grid">
        <div><dt>Monthly income</dt><dd>{inr(dash.monthlyIncome)}</dd></div>
        <div><dt>Existing EMIs</dt><dd>{inr(dash.existingEmi)}</dd></div>
        <div>
          <dt>Max affordable EMI</dt>
          <dd>{inr(maxEmi)}</dd>
          {dash.maxEmi === undefined && <small className="muted">{FOIR_LIMIT * 100}% of income − existing EMIs</small>}
        </div>
        <div><dt>Max eligible loan</dt><dd>{dash.maxLoan !== undefined ? inrShort(dash.maxLoan) : '—'}</dd></div>
        <div><dt>Down payment</dt><dd>{inrShort(dash.downPayment)}</dd></div>
        <div>
          <dt>Requested property</dt>
          <dd>{inrShort(dash.propertyValue)}</dd>
          {eligible !== undefined && (
            <small className={eligible ? 'pos' : 'neg'}>
              {eligible ? 'Eligible' : 'Not eligible'}
              {dash.foirPct !== undefined && ` · FOIR ${dash.foirPct}%`}
            </small>
          )}
        </div>
      </dl>

      {dash.banks && (
        <div className="dash-banks">
          <span className="muted small">Likely to approve:</span>
          {dash.banks.length ? (
            <ul className="tags">{dash.banks.map((b) => <li key={b}>{b}</li>)}</ul>
          ) : (
            <span className="neg small">{dash.banksNote}</span>
          )}
        </div>
      )}
      {dash.analysis && (
        <details className="dash-reco">
          <summary>Bank-by-bank analysis from MortgageDash</summary>
          <p>{dash.analysis}</p>
        </details>
      )}
      {dash.eligible && requestedCash !== undefined && requestedCash > dash.downPayment && (
        <p className="notice info small">
          <strong>MortgageDash approves the loan, but the {inrShort(dash.propertyValue)} purchase needs more cash.</strong> Its check is
          income-based (FOIR). Buying also needs the RBI minimum down payment plus stamp duty, registration and fees, about{' '}
          {inrShort(requestedCash)} in all, against your {inrShort(dash.downPayment)}.
        </p>
      )}
      {budget && dash.maxLoan !== undefined && budget.loanUsed < dash.maxLoan - 50_000 && (
        <p className="notice info small">
          <strong>Your {inrShort(dash.downPayment)} down payment is the limit, not the loan.</strong> RBI lets banks lend only 75–90% of
          the price, and stamp duty &amp; registration are paid in cash, so the most you can buy in {budget.city} is about{' '}
          <strong>{inrShort(budget.maxPrice)}</strong> (using a {inrShort(budget.loanUsed)} loan). Using the full {inrShort(dash.maxLoan)} loan
          needs about {inrShort(budget.fullLoanCash)} of own funds for a {inrShort(budget.fullLoanPrice)} home.
        </p>
      )}
      <p className="small">
        <strong>{matching}</strong> home{matching === 1 ? '' : 's'} in {area} fit this loan and down payment below. Homes whose EMI exceeds{' '}
        {inr(maxEmi)} are marked as a stretch.
        {elsewhere && elsewhere.count > 0 && (
          <>
            {' '}
            <button className="link inline-link" onClick={elsewhere.onShow}>
              Show {elsewhere.count} that fit across {elsewhere.label} →
            </button>
          </>
        )}
      </p>
    </div>
  );
}

function riskClass(risk: string) {
  return /high/i.test(risk) ? 'over' : /med/i.test(risk) ? 'stretch' : 'fits';
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
