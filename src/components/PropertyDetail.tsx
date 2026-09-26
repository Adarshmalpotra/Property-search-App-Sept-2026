import { useEffect, useRef } from 'react';
import type { Property } from '../data/properties';
import { CITY_COSTS, type Affordability, type MortgageProfile } from '../lib/finance';
import { inr, inrShort, pct } from '../lib/format';
import { FIT_LABEL, PropertyArt } from './PropertyCard';

interface Props {
  property: Property;
  fit: Affordability;
  profile: MortgageProfile;
  shortlisted: boolean;
  onToggleShortlist: () => void;
  onClose: () => void;
}

export function PropertyDetail({ property: p, fit, profile, shortlisted, onToggleShortlist, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  const c = fit.costs;
  const ltv = c.loan / p.price;

  return (
    <dialog ref={ref} className="modal" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="detail-h">
      <div className="modal-inner">
        <button className="close" onClick={onClose} aria-label="Close">×</button>
        <div className="detail-media">
          <PropertyArt property={p} />
          <span className={`badge badge-${fit.fit}`}>{FIT_LABEL[fit.fit]}</span>
        </div>
        <div className="detail-body">
          <p className="eyebrow">{p.locality} · {p.zone} · {p.city}</p>
          <h2 id="detail-h">{p.title}</h2>
          <p className="price big">{inrShort(p.price)} <span className="muted small">({inr(p.price)})</span></p>

          <ul className="facts">
            <li><span>Configuration</span>{p.bhk === 0 ? 'Studio' : `${p.bhk} BHK`} {p.type}</li>
            <li><span>Carpet area</span>{p.carpetSqft.toLocaleString('en-IN')} sq ft</li>
            <li><span>Rate</span>₹{p.pricePerSqft.toLocaleString('en-IN')}/sq ft</li>
            <li><span>Status</span>{p.status}</li>
            <li><span>Possession</span>{p.possession}</li>
            <li><span>Floor</span>{p.floor}</li>
            <li><span>Facing</span>{p.facing}</li>
            <li><span>Developer</span>{p.developer}</li>
            <li><span>RERA</span><code>{p.reraId}</code></li>
          </ul>

          <h3>What it costs you</h3>
          <table className="costs">
            <tbody>
              <tr><td>Home loan ({pct(ltv)} of price)</td><td>{inr(c.loan)}</td></tr>
              <tr><td>Down payment</td><td>{inr(c.downPaymentPortion)}</td></tr>
              <tr><td>Stamp duty ({pct(CITY_COSTS[p.city].stampDuty)})</td><td>{inr(c.stampDuty)}</td></tr>
              <tr><td>Registration</td><td>{inr(c.registration)}</td></tr>
              {c.gst > 0 && <tr><td>GST (under construction)</td><td>{inr(c.gst)}</td></tr>}
              <tr><td>Loan processing fee (0.5%)</td><td>{inr(c.processingFee)}</td></tr>
              <tr className="total"><td>Cash you need</td><td>{inr(c.cashNeeded)}</td></tr>
              <tr><td>Your own funds</td><td>{inr(profile.downPayment)}</td></tr>
              <tr className={fit.cashGap > 0 ? 'neg' : 'pos'}>
                <td>{fit.cashGap > 0 ? 'Shortfall' : 'Left over'}</td>
                <td>{inr(Math.abs(fit.cashGap))}</td>
              </tr>
            </tbody>
          </table>

          <div className="emi-box">
            <div>
              <span className="muted small">Monthly EMI</span>
              <strong>{inr(c.monthlyEmi)}</strong>
              {fit.emiOverComfort && profile.monthlyEmi && (
                <span className="warn small">Above your comfortable EMI of {inr(profile.monthlyEmi)}</span>
              )}
            </div>
            <div>
              <span className="muted small">Total interest over {profile.tenureYears} yrs</span>
              <strong>{inrShort(c.totalInterest)}</strong>
            </div>
          </div>
          {c.loanLimitedBy === 'ltv' && (
            <p className="notice info small">
              The loan is capped by RBI loan-to-value limits ({pct(ltv, 0)} of price), not by your eligibility of {inrShort(profile.eligibleLoan)}.
            </p>
          )}

          <h3>Neighbourhood</h3>
          <ul className="tags">{p.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
          <h3>Amenities</h3>
          <ul className="tags">{p.amenities.map((a) => <li key={a}>{a}</li>)}</ul>

          <p className="muted small">{CITY_COSTS[p.city].note} Sample listing for demonstration.</p>
          <div className="row gap">
            <button className="btn btn-primary" onClick={onToggleShortlist}>{shortlisted ? '♥ Shortlisted' : '♡ Add to shortlist'}</button>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
