# HomeFit — property search for Mumbai & Bengaluru

A home-buying search app that takes your loan eligibility from
[MortgageDash](https://mortgagedash-ai.lovable.app) and shows which homes in **Mumbai** and **Bengaluru** you can buy.
Every listing is priced against your loan, including all the extra costs of buying.

## What it does

1. **Import your mortgage profile.** You can do this in three ways:
   - paste the MortgageDash result as text (`Max Loan Eligibility: ₹92,00,000`, `Down payment: 28 lakh`, `8.4%`, `20 years`, …)
   - paste it as JSON (nested keys like `maxLoanAmount`, `emi`, `tenureMonths` are recognised)
   - open a link: `https://<app>/?loan=9200000&down=2800000&rate=8.4&tenure=20&emi=79300`. MortgageDash can deep-link straight in this way.

   If you only give an EMI, the app works out the loan it can service. You can edit any field by hand; amounts accept `85L`, `1.2Cr` and `45k`.
2. **See your real budget per city.** This is the highest ready-to-move price your own funds can cover after:
   - RBI loan-to-value caps (90% / 80% / 75% slabs)
   - stamp duty: Mumbai 6% incl. metro cess; Bengaluru about 5.6%
   - registration fees
   - GST on under-construction homes (5%, or 1% for affordable homes)
   - a 0.5% loan processing fee
3. **Search and filter listings.** Filter by city, locality, BHK, type, construction status and affordability. Sort by best fit, price, EMI, ₹/sq ft or area.
   Each card shows the EMI, the total cash needed, and how much you are short or have left over. It is tagged **Within budget**, **Stretch** or **Over budget**.
4. **Open a listing** to see the full cost breakdown, the total interest, and a note when the RBI LTV cap limits the loan rather than your eligibility.
5. **Shortlist and compare** homes side by side. The profile, filters and shortlist are saved in your browser (localStorage).

## Stack

Vite + React 19 + TypeScript. Plain CSS with light and dark themes; no UI framework, no backend.

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # vitest: finance maths + MortgageDash importer
npm run build     # static site in dist/ (relative base, host anywhere)
```

## Project layout

| Path | Purpose |
| --- | --- |
| `src/lib/finance.ts` | EMI, RBI LTV, city stamp duty/registration, GST, affordability & max-budget search |
| `src/lib/importProfile.ts` | Parses MortgageDash output (text / JSON / URL) into a loan profile |
| `src/data/properties.ts` | Sample catalogue: 131 listings across 22 localities (12 Mumbai/MMR, 10 Bengaluru) |
| `src/components/*` | Profile panel, listing card, detail dialog, compare view |

## Caveats

- **The listings are sample data.** They are generated from indicative 2026 locality rates and are not live inventory. Replace
  `src/data/properties.ts` with a real feed (a portal API or your own CMS) to go live.
- **Stamp duty, registration, GST and LTV rules are estimates.** Check them with your lender and the state registration office.
