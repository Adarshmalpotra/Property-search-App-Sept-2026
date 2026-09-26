# HomeFit — property search for Mumbai & Bengaluru

A home-buying search app that takes your loan eligibility from
[MortgageDash](https://mortgagedash-ai.lovable.app) and shows which homes in **Mumbai** and **Bengaluru** you can buy.
Every listing is priced against your loan, including all the extra costs of buying.

## What it does

1. **Import your mortgage profile.** The main route is a row copied from MortgageDash's Google Sheets:
   - **Output sheet row** (17 columns: Timestamp, Name, Email, Phone, Location, Employment, Monthly income, Down payment,
     Property value, Existing EMIs, FOIR %, Eligible, Max EMI, Max loan, Bank analysis, Likely approving banks, Risk).
     The max loan, down payment and max EMI are used as-is, and the search jumps to the applicant's city and district
     (e.g. `MUMBAI SUBURBAN`). The approving banks, risk level and bank-by-bank analysis are shown alongside.
   - **Input sheet row** (9 columns: Name, Email, Phone, Employment, Location, Monthly income, Existing EMIs, Property value,
     Down payment). The max EMI is derived the way MortgageDash does it (50% of income − existing EMIs), and the loan from that EMI
     at the rate and tenure you set.
   - Email and phone are ignored and never stored.

   The panel then shows MortgageDash's verdict next to what is really buyable:
   - If the down payment, not the loan, is the limit, it says so and shows the own funds needed to use the full loan.
   - MortgageDash's eligibility check is income-based (FOIR). If it approves a loan but the requested home also needs more cash
     than the down payment (RBI minimum margin plus stamp duty, registration and fees), the panel says how much.

   Other ways in:
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
3. **Search and filter listings.** Filter by city, district, locality, BHK, type, construction status and affordability. Sort by best fit, price, EMI, ₹/sq ft or area.
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
| `src/lib/mortgageDash.ts` | Reads MortgageDash Input/Output sheet rows and turns them into a search profile |
| `src/lib/importProfile.ts` | Parses other formats (labelled text / JSON / URL) into a loan profile |
| `src/data/properties.ts` | Sample catalogue: 147 listings across 25 localities (15 Mumbai/MMR, 10 Bengaluru), tagged by revenue district |
| `src/components/*` | Profile panel, listing card, detail dialog, compare view |

## Caveats

- **The listings are sample data.** They are generated from indicative 2026 locality rates and are not live inventory. Replace
  `src/data/properties.ts` with a real feed (a portal API or your own CMS) to go live.
- **Stamp duty, registration, GST and LTV rules are estimates.** Check them with your lender and the state registration office.
