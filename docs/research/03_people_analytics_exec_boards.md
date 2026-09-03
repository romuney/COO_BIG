# Research notes: executive people boards — metrics, definitions, benchmarks

> Сырые заметки исследовательского агента (на английском), с указанием источников. Синтез на русском — в `docs/01_best_practices.md` и `docs/03_metrics_catalog.md`.
> Метки: **[F]** = страница прочитана полностью; **[S]** = только поисковый фрагмент; **(unverified)** = единственный или слабый источник. Большинство первоисточников (McKinsey, Bain, Gallup, Gartner, BLS, Visier, Culture Amp) были недоступны напрямую.

## 1. What best-in-class companies show their CEO/COO monthly

**Vendor templates**
- **Visier** — "Vee Boards": AI-augmented insight boards focused on one issue at a time (e.g., a People Cost Board for CHRO+CFO), rather than a wall of KPIs [S]: https://www.visier.com/products/visier-people/ ; https://www.visier.com/people-analytics/people-analytics-dashboard/
- **Workday People Analytics** — 70+ metrics in six topic areas: Retention & Attrition; Organization Composition (headcount, internal movement, span of control); Hiring; D&I; Talent & Performance; Skills — surfaced as "stories/top insights" [S]: https://www.workday.com/content/dam/web/en-us/documents/datasheets/workday-people-analytics.pdf
- **ChartHop** — board-level org questions: headcount plan vs actual, scenario modeling, budget dashboards [S]: https://www.charthop.com/modules/headcount-planning
- Practitioner guidance converges on **6–8 headline KPIs**, opening with headcount, voluntary turnover, cost per hire, time-to-fill, pay-equity gap and engagement, with drill-downs below [S]: https://www.agile-hr-analytics.com/10-must-have-cards-chro-executive-hr-dashboard/
- A published "human capital scorecard" example (Discovery Ltd): org structure, headcount, demographics, recruitment, retention, engagement, D&I, comp, drill-down into attrition of top performers; rhythm: HR head reviews Monday with written commentary, CEO/CFO receive it Wednesday [S]: https://talentsherpa.substack.com/p/the-human-capital-scorecard-your

**Thought leaders / standards**
- **Josh Bersin**: people analytics should answer the CEO's biggest problems; four areas — retention, performance, leadership, culture [S]: https://joshbersin.com/definitive-guide-to-people-analytics/
- **Gartner**: benchmarks vs peers; boards want snapshot KPIs such as voluntary turnover and eNPS; org-design benchmarks on spans and layers [S]: https://www.gartner.com/en/human-resources/insights/hr-metrics
- **McKinsey**: the "G-3" (CEO, CFO, CHRO); critical roles get dashboards reviewed at CEO level [S]: https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/an-agenda-for-the-talent-first-ceo ; https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/linking-talent-to-value
- **Deloitte Human Capital Trends**: hours-worked productivity metrics are inadequate; "human performance" [S]: https://www.deloitte.com/us/en/insights/topics/talent/human-capital-trends.html
- **Google re:Work (Project Oxygen)**: manager quality via upward-feedback surveys; retention correlated more with manager quality than seniority, performance or tenure [S]: https://rework.withgoogle.com/intl/en/guides/following-the-data-the-research-behind-great-managers
- **Microsoft**: measures "thriving" (energized and empowered to do meaningful work) twice a year; 77% thriving [F]: https://www.microsoft.com/en-us/worklab/podcast/microsofts-dawn-klinghoffer-on-how-leaders-can-tell-if-employees-are-thriving
- **ISO 30414** (2018, revised 2025): reference standard for human-capital reporting; ISO/TS 30431 (recruitment/mobility/turnover), ISO/TS 30432 (leadership incl. span of control) [S]: https://www.iso.org/news/ref2689.html
- SEC 10-K human-capital disclosures: after headcount, the most common items are diversity and turnover; only ~19% publish an actual turnover rate [S]: https://www.gibsondunn.com/four-years-of-evolving-form-10-k-human-capital-disclosures/

**The 10–15 metrics that typically make the cut (synthesis)**
1. Size & cost: headcount vs plan/cap; workforce cost
2. Flow: hires, voluntary/involuntary attrition, **regrettable** attrition, internal mobility/promotions
3. Talent acquisition: time-to-fill, offer acceptance, open reqs/aging, cost per hire
4. Structure: span of control, layers, % managers
5. Experience: engagement/thriving index, eNPS, manager effectiveness
6. Capability & risk: skills gaps, AI adoption, attrition-risk flags
7. Fairness: diversity mix, pay equity

**Contextualization conventions**: every headline KPI vs (a) plan/target, (b) same month prior year and trend, (c) an external benchmark (Gartner DataHub, Culture Amp/Glint, Gallup percentile).

## 2. Definitions, conventions and benchmark values

**Attrition/turnover**
- SHRM-style formula: separations ÷ average headcount × 100; exclude internal transfers and leaves.
- Annualized vs monthly: do not multiply a monthly rate ×12; use trailing-12-month separations ÷ 12-month average headcount.
- Regrettable = voluntary exit of someone the company wanted to keep; practical rules: top 10–20% performer and/or hard to replace within 6 months. https://newsletter.pragmaticengineer.com/p/attrition
- Benchmarks: US voluntary attrition 13% (Mercer 2025); European tech 2025 total attrition 17.4% (Ravio) https://ravio.com/blog/employee-retention-trends ; regrettable targets commonly cited <5–8% (vendor glossaries, unverified).
- "Managed" non-regrettable attrition targets: Amazon ~6% unregretted attrition (URA) at director level (leaked docs) https://www.reworked.co/talent-management/amazon-leaders-reject-policy-to-push-employees-out/ ; Meta (Jan 2025) cut ~5% lowest performers with intent to backfill, targeting ~10% non-regrettable attrition for the cycle https://www.cnbc.com/2025/01/14/meta-targeting-lowest-performing-employees-in-latest-round-of-layoffs.html

**Early attrition**
- 90-day turnover: 22% of new hires leave within 90 days (Insight Global) vs 33% (Jobvite); benchmark percentiles for 90-day new-hire turnover: 25th pct 1.73%, 75th pct 5.49% (HRbench) https://www.hrbench.com/resource/learn/90-day-new-hire-turnover
- ~40% of all turnover occurs in the first year (Work Institute) https://workinstitute.com/first-year-turnover/

**Headcount bridge / waterfall**
- Opening + Hires/Rehires + Transfers-in − Transfers-out − Terminations = Closing; FP&A rollforward adds variance-to-budget; reconcile HR and Finance monthly. https://www.headcount365.com/blog/mastering-the-headcount-waterfall-report ; https://help.planful.com/docs/understanding-variance-analysis-report-and-headcount-rollforward-report

**Vacancy / understaffing**
- BLS JOLTS job-openings rate = openings ÷ (employment + openings) × 100 — matches "open reqs ÷ (open reqs + headcount)". https://www.bls.gov/jlt/jltdef.htm
- HR-glossary vacancy rate "good" range 3–7% (low-authority, unverified).

**Time-to-fill vs time-to-hire**
- Time-to-fill: requisition open → offer accepted; time-to-hire: application → offer accepted. https://www.icims.com/blog/time-to-fill-vs-time-to-hire-key-metrics-explained/
- Benchmarks: SHRM 2026 median time-to-fill 39 days non-executive (44 in 2025), 45 days executive; engineering roles 50–62 days (LinkedIn 2024). https://www.shrm.org/content/dam/en/shrm/research/2025-recruiting-benchmarking-report.pdf

**Offer acceptance / decline**
- Ashby 2025: 84% acceptance (≈1 in 6 offers lost); Gem 2025: 84%. https://www.ashbyhq.com/talent-trends-report ; https://www.gem.com/blog/10-takeaways-from-the-2025-recruiting-benchmarks-report

**Overdue reqs / backfill vs net-new**
- Aging requisition rate = open reqs past the agreed age ÷ total open reqs; 90 days is the common "problem" threshold. https://www.ere.net/is-your-requisition-stuck-at-100-200-365-days-open-get-it-moving/ ; "requisition cholesterol graph": https://www.onemodel.co/blog/requisition-cholesterol-graph
- Backfill = an approved seat that became vacant (budget-neutral); net-new = adds to plan and needs a business case.

**Internal mobility, promotion, intern conversion**
- Share of roles filled internally: 39% in 2024 vs 32% prior year (Veris Insights range 30–39%). https://www.hrdive.com/news/internal-hiring-saves-money-boosts-retention/693944/
- Promotion rate: Mercer — ~9–10% of employees promoted in 2025, 8.1% planned for 2026; SHRM average ~7%. https://worldatwork.org/publications/workspan-daily/mercer-forecasts-3-5-total-salary-increase-budgets-for-2026
- Intern conversion (NACE 2026): 63.1% (five-year high), acceptance rate 88.3%. https://www.naceweb.org/talent-acquisition/internships/intern-conversion-rate-hits-highest-mark-in-five-years

**Juniors share context**
- Stanford "Canaries in the Coal Mine" (Aug 2026): employment of 22–25-year-olds in AI-exposed occupations is 19% below the counterfactual; the gap works through reduced hiring. https://digitaleconomy.stanford.edu/news/canariesaug26/
- SignalFire 2025: new grads ~7% of Big Tech hires; new-grad hiring down >50% vs 2019. https://www.signalfire.com/blog/signalfire-state-of-talent-report-2025

## 3. Span of control & delayering

- **McKinsey archetypes**: player/coach 3–5 reports; coach 6–7; supervisor 8–10; facilitator 11–15; coordinator 15+ — span follows work complexity. https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/how-to-identify-the-right-spans-of-control-for-your-organization
- **Bain**: skills-based roles (engineers, brand managers) 6–8 reports, task-based roles 15+. https://www.bain.com/insights/streamlining-spans-and-layers/
- **Gallup**: manager engagement lowest at 1–2 reports, peaks at 8–9; 37% of managers have <5 reports, 66% <10. https://www.gallup.com/workplace/700718/span-control-optimal-team-size-managers.aspx
- **Gartner**: managers have 51% more responsibilities than they can handle; 3/4 of HR leaders say managers are overwhelmed. https://www.gartner.com/en/human-resources/trends/managers-are-cracking-and-more-training-wont-help
- **Layers heuristics**: 5–7 layers CEO→frontline works, beyond ~8 decisions slow; right-sizing spans/layers saves 10–15% of managerial cost (attributed to McKinsey; secondary). Median "% managers" 16% (HRbench) vs PwC Saratoga 16 employees per manager (≈6%) — different definitions; define yours explicitly. https://www.hrbench.com/resource/learn/percent-managers ; https://workforce.pwc.com/hr-metrics/manager-headcount-ratio/
- **Amazon** (Sept 2024): raise the ratio of ICs to managers by ≥15% by end of Q1 2025 to remove layers. https://www.aboutamazon.com/news/company-news/ceo-andy-jassy-latest-update-on-amazon-return-to-office-manager-team-ratio
- **Google** (Aug 2025): 35% fewer managers overseeing fewer than three people vs a year earlier. https://www.cnbc.com/2025/08/27/google-executive-says-company-has-cut-a-third-of-its-managers.html
- **Meta** (2023 "Year of Efficiency"): "flattening" — removing layers; 5,000 open reqs closed. https://fortune.com/2023/02/07/meta-mark-zuckerberg-flattening-managers-transition-new-roles-efficiency
- **Microsoft** (2025): ~6,000 in May explicitly to reduce management layers and widen spans. https://www.cnbc.com/2025/05/13/microsoft-is-cutting-3percent-of-workers-across-the-software-company.html
- **Bersin**: flattening + AI creates the "supermanager"; only 27% of managers globally are engaged (Gallup). https://joshbersin.com/2025/10/the-rise-of-the-supermanager/

## 4. AI adoption & productivity signals

**How adoption is measured**
- **GitHub Copilot usage metrics** [F]: daily active user = unique user who interacted that day; engaged user = ≥2 active days in the trailing 28-day window; acceptance rate (by count and by lines); adoption cohorts (Passive / Code first / Agent first / Multi-agent); recommended set: DAU/WAU, cohort distribution, acceptance-rate trend, PR merge counts. https://docs.github.com/en/copilot/concepts/copilot-usage-metrics/copilot-metrics
- **Microsoft Copilot Dashboard (Viva Insights)**: active user = licensed employee with ≥1 intentional Copilot action in the preceding 28 days; returning-user %, usage intensity, comparisons by org/function/manager type. https://m365admin.handsontek.net/microsoft-copilot-dashboard-viva-insights-adoption-metrics-microsoft-365-copilot-chat/
- **Microsoft WTI 2024 "power user"**: uses AI at least several times per week and saves >30 min/day; 75% of knowledge workers used gen AI, 78% BYOAI [F]: https://www.microsoft.com/en-us/worklab/work-trend-index/ai-at-work-is-here-now-comes-the-hard-part
- Seat-utilization heuristics: only 20–30% of licensed seats used weekly in many enterprises; ~3 active days/week as the habit threshold (unverified vendor claims). https://www.worklytics.co/resources/2025-ai-adoption-benchmarks-employee-usage-statistics

**Survey benchmarks**
- WTI 2025: 69% of leaders vs 45% of employees use AI regularly [F]: https://www.microsoft.com/en-us/worklab/work-trend-index/2025-the-year-the-frontier-firm-is-born
- WTI 2026: only 19% of AI users sit in "Frontier" environments; org factors explain 67% of reported AI impact vs 32% individual [F]: https://www.microsoft.com/en-us/worklab/work-trend-index/agents-human-agency-and-the-opportunity-for-every-organization
- McKinsey Superagency (Jan 2025): 13% of employees use gen AI for ≥30% of daily work vs a C-suite estimate of 4%. https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/superagency-in-the-workplace-empowering-people-to-unlock-ais-full-potential-at-work
- BCG AI at Work 2025: 72% regular gen-AI users; frontline stalled at 51% ("silicon ceiling"); 2026 update: frontline 74%. https://www.bcg.com/publications/2025/ai-at-work-momentum-builds-but-gaps-remain
- Gallup (US employees, Q1 2026): 50% use AI at work at least a few times a year; 28% weekly or more; 13% daily. https://www.gallup.com/workplace/701195/frequent-workplace-continued-rise.aspx

**Meeting load / collaboration overload metrics**
- Viva Insights: meeting hours; after-hours collaboration hours; focus time (≥1h uninterrupted blocks); burnout-risk framing; aggregated manager dashboards. https://learn.microsoft.com/en-us/viva/insights/advanced/reference/metrics
- WTI "Infinite Workday" (2025) [F]: interruptions every 2 minutes; 117 emails/day; 58 after-hours messages per user (+15% YoY); meetings after 8 p.m. +16% YoY; 57% of meetings ad hoc. https://www.microsoft.com/en-us/worklab/work-trend-index/breaking-down-infinite-workday
- WTI 2023 [F]: 57% of time communicating vs 43% creating; 68% lack uninterrupted focus time; top-quartile meeting users spend 7.5 h/week in meetings. https://www.microsoft.com/en-us/worklab/work-trend-index/will-ai-fix-work
- Rob Cross/HBR: collaborative work rose 50%+ to 85%+ of the week; overload is a burnout precursor. https://hbr.org/2021/09/collaboration-overload-is-sinking-productivity

**"Digital exhaust" caveats**
- 81% of people-analytics leaders say ethics/privacy concerns have compromised data projects (Insight222 via AIHR, not re-verified). https://www.aihr.com/blog/people-analytics-ethical-considerations/
- Vendor practice: only aggregated, de-identified team data with minimum group sizes; trends and distributions, never individual telemetry, on an exec board.

## 5. Organizational health indices

- **McKinsey OHI**: 9 outcomes and 37 management practices; database of 6M+ respondents; results benchmarked into quartiles and linked to EBITDA/TSR. https://www.mckinsey.com/kr/our-insights/organizational-health-a-fast-track-to-performance-improvement
- **Gallup Q12**: 12 items; engaged / not engaged / actively disengaged; GrandMean and percentile rank. Global engaged 20% in 2025 (16% actively disengaged); managers 27%. https://www.gallup.com/workplace/349484/state-of-the-global-workplace.aspx
- **Viva Glint**: 2-item engagement index (eSat + recommend) on a 0–100 scale; the mean over favorability because favorability hides movement. https://techcommunity.microsoft.com/t5/viva-glint-methodology-and/how-does-viva-glint-define-and-measure-engagement/td-p/3855603
- **Culture Amp**: 5-item engagement index; New Tech (500–1,000) eNPS 13 (Jan 2025). https://www.cultureamp.com/science/insights/new-tech-500-1000
- **Composite-index pitfalls** (OECD/JRC): effective importance is driven by indicator variance and correlation; correlated indicators double-count; linear aggregation lets a strong component compensate a weak one; publish the underlying indicators and run sensitivity analysis. https://www.oecd.org/content/dam/oecd/en/publications/reports/2008/08/handbook-on-constructing-composite-indicators-methodology-and-user-guide_g1gh9301/9789264043466-en.pdf

## 6. Headcount growth-control / cap reporting

- FP&A convention: forecast = current headcount + approved-but-unfilled positions (weighted by hiring velocity/slippage) − expected attrition (trailing-12-month rate); presented as a bridge including departures, transfers, accepted offers. https://www.venasolutions.com/blog/headcount-planning-forecasting
- "Landing forecast": where headcount will land at period end, from historical attrition, hiring velocity and backfill patterns; 12–18-month rolling forecast updated monthly; counts "accepted but not started" drop-offs as a failure mode. https://www.teamohana.com/blog/predicted-forecast
- Visual conventions: headcount waterfall, rollforward tables with variance to budget, plan-vs-actual-vs-rolling-forecast lines, open-req tiles.
- How large tech companies framed caps: Meta closed 5,000 open reqs (2023) and cut 5% with backfill (2025) — a cap on net headcount, not gross hiring; Amazon expressed its constraint as a ratio (IC:manager +15%); Pichai's "don't solve everything with headcount"; Bank of America let attrition run against a target. https://www.bankingdive.com/news/bank-of-america-4000-job-cuts-attrition-no-layoff-math-messaging-moynihan-earnings/648079/

## Implications for our exec board
1. **Lead with a cap bridge, not a headcount number.** Opening → hires (net-new vs backfill) → transfers in/out → leavers (regrettable / non-regrettable / involuntary) → Closing, plus **committed headcount** = actual + accepted-not-started + open approved reqs vs the cap; a year-end **landing forecast** = actual + velocity-weighted pipeline − T12M attrition run-rate. HQ and line staff as separate bridges.
2. **Standardize attrition on the T12M annualized voluntary rate**, with regrettable/non-regrettable, tenure (<90 days, <1 year), HQ vs line, critical roles. Benchmarks: US voluntary 13% (Mercer 2025), European tech 15–17% (Ravio), regrettable target <5–8%, 90-day new-hire turnover band ~2–5%.
3. **Report the "refresh 5%" as non-regrettable attrition YTD vs target**, always paired with regrettable attrition in the same tile; track share of exits with a documented performance rationale.
4. **Hiring page = four numbers**: vacancy rate (JOLTS convention), % reqs open >90 days, median time-to-fill (SHRM 39 days non-exec; engineering 50–62), offer acceptance (84%). Split net-new vs backfill.
5. **Spans & layers as distributions, not averages**: % managers with ≤2–3 reports, % with ≥12, median span (Bain 6–8; McKinsey archetypes), number of layers (flag >7–8), % managers (define explicitly), IC:manager ratio trend. Review quarterly to catch re-layering.
6. **AI adoption as a funnel with fixed definitions**: coverage (licensed %), monthly active (≥1 action in 28 days), habitual (≥2 active days per 28, or ≥3 days/week), power users (several times/week and >30 min/day saved). Contextualize with Gallup (28% weekly+), BCG (72% regular).
7. **Workload page from aggregated collaboration telemetry only**: meeting hours/week, after-hours hours, share with <X hours focus time; trends and distributions by division with a minimum group size; publish the data-use policy on the page.
8. **Do not build one "org health index."** Show 3–4 components side by side with percentiles; if a composite is required, publish the weights and components.
9. **Juniors share**: % of external hires and % of headcount early-career, intern conversion (NACE 63%), early-career attrition — vs plan, with Stanford/SignalFire context.
10. **Regionalization**: % of headcount and % of new hires in target hubs vs plan, transfers on the bridge; no external benchmark — present strictly vs internal plan.
11. **Goal coverage and internal analytics-product adoption** in the same adoption-funnel grammar as AI: coverage, MAU, WAU, stickiness — by division and by leader.
12. **Contextualize every tile three ways**: vs plan/cap, vs same month prior year, vs external benchmark (name the source and year); RAG thresholds from benchmark bands; 6–8 headline tiles per page; one written "so what" per page.
13. **Definition governance**: ISO 30414-aligned formulas; a one-page metric dictionary; reconcile the headcount bridge with Finance's rollforward monthly.
14. **Risk-signals page as an exception list**, not a score: teams with span ≥12, managers with ≤2 reports, reqs open >90 days, offer acceptance <80%, regrettable exits in critical roles, 90-day attrition above the 75th percentile, after-hours load rising 3 months, engagement drops >5 points.
15. **Cadence**: monthly board for flow/structure/adoption; quarterly deep dives for engagement and spans-and-layers; annual external benchmark refresh.

Verification caveat: the strongest primary confirmations are the Microsoft WorkLab reports and GitHub Copilot metric definitions; consultancy benchmarks are consistent across secondary summaries but were not read on the primary pages; vendor "good range" figures are indicative only.
