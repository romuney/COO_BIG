# Research notes: design standards for executive reporting (IBCS, Few, Tufte, Minto, board packs)

> Сырые заметки исследовательского агента (на английском), с указанием источников. Синтез на русском — в `docs/01_best_practices.md`.
> Метод и оговорки: большинство первоисточников (ibcs.com, perceptualedge.com, edwardtufte.com, nngroup.com, boardintelligence.com, storytellingwithdata.com) были недоступны напрямую; выводы взяты из поисковых фрагментов первоисточников и их дословных копий на GitHub (ссылки даны). Непроверенное помечено **(unverified)**.

## 1. IBCS (International Business Communication Standards, Hichert)

**The SUCCESS rule set**
- Seven rule families: **SAY** (convey a message), **UNIFY** (consistent semantic notation), **CONDENSE** (maximise information density), **CHECK** (visual integrity), **EXPRESS** (right visualisation), **SIMPLIFY** (remove clutter), **STRUCTURE** (organise content MECE). https://www.ibcs.com/standards/ ; https://www.trusteddecisions.com/en/wiki/what-is-ibcs-international-business-communication-standards-explained/
- Three pillars: conceptual (SAY, STRUCTURE), perceptual (EXPRESS, CHECK, CONDENSE, SIMPLIFY), semantic (UNIFY — "same meaning, same look"). 98 rules; recommended working order UNIFY → SAY → STRUCTURE → EXPRESS → SIMPLIFY → CONDENSE → CHECK. https://data4success.de/en/effective-business-communication-thanks-to-ibcs/
- IBCS notation became the basis of ISO 24896 "Standard notation for business reports" (IBCS v2.0 released alongside, June 2026 per ibcs.com — not independently verified). https://www.ibcs.com/ibcs-goes-iso/ ; https://www.ibcs.com/ibcs-version-2-0/

**SAY — messages and titles**
- Put the *message* (a complete declarative sentence, e.g., "Attrition rose to 14% in Q2, driven by senior engineers") at the top of every page; a separate *title* identifies the object: organisational unit, measure (with unit), time period. https://www.ibcs.com/standards/page/3/
- Title sits top-left; position may be company-specific but must be consistent. https://www.ibcs.com/wp-content/uploads/2018/12/IBCSWorkingGroup-Mandatory-vs-optional_2018-12-13_jf.pdf

**UNIFY — scenario notation (the core convention to adopt)**
- Scenario abbreviations: **AC** actual, **PY** previous year, **PL** plan/budget, **FC** forecast. https://www.ibcs.com/IBCS/
- Fills: **Actual = solid dark**; **Previous year = solid lighter grey**; **Plan = outlined (hollow)**; **Forecast = hatched**. "solid = real, hollow = planned, hatched = forecast". https://learn.microsoft.com/en-us/fabric/iq/plan/intelligence-ibcs/how-to-configure-ibcs-column-bar-charts ; https://inforiver.com/blog/inforiver-analytics-plus/variance-analysis-powerbi-inforiver-analytics-plus/
- Orientation: **time runs horizontally**, **structure/categories run vertically**.
- Colour is reserved for meaning (scenario, variance, status) — "never decoration".

**Variance charts**
- Absolute variance (ΔPL = AC − PL, ΔPY = AC − PY) and relative variance (ΔPL%, ΔPY%) as separate adjacent tiers; relative variances as thin "pins".
- Variance colour encodes **business impact, not arithmetic sign**: green = favourable, red = unfavourable; polarity ("more is better" vs "less is better") declared per measure.

**CHECK — scales**
- Same scale for the same unit across comparable charts on a page; no truncated axes (columns start at zero); scale bands / outlier indicators rather than silent rescaling.

**CONDENSE / SIMPLIFY / STRUCTURE / EXPRESS**
- CONDENSE: increase density on one page — small components, small multiples, add data rather than white space.
- SIMPLIFY: remove decoration, backgrounds, frames, 3D, redundant labels.
- STRUCTURE: MECE hierarchy of content.
- EXPRESS "replace" list: pie/ring charts, gauges/speedometers, radar/funnel charts, spaghetti line charts, traffic-light indicators as variance display (rule numbering unverified).

## 2. Stephen Few — *Information Dashboard Design*

- Definition: "A dashboard is a visual display of the most important information needed to achieve one or more objectives; consolidated and arranged on a single screen so the information can be monitored at a glance." https://www.perceptualedge.com/articles/ie/dashboard_confusion.pdf
- "This single-screen display need not be comprehensive in and of itself, but it must provide the overview that is needed to know when action is required, and ideally should provide an easy gateway to any additional information." https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf
- Critique: "most dashboards say too little, and what they do say requires far too much effort to discern"; "Any dashboard that fails to deliver the information that people need clearly and quickly will never be used, no matter how cute its gauges, meters, and traffic lights."

**The 13 pitfalls (audit list)**: 1. Exceeding a single screen; 2. Inadequate context; 3. Excessive detail or precision; 4. Expressing measures indirectly / deficient measure; 5. Inappropriate display media (pies, gauges); 6. Meaningless variety; 7. Poorly designed display media; 8. Encoding data inaccurately (non-zero bar baselines); 9. Arranging data poorly; 10. Highlighting important data ineffectively; 11. Useless decoration; 12. Misusing/overusing colour; 13. Unattractive display. https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf

**Actionable rules**
- Context: "Pair every key measure with at least one meaningful comparison… target or budget, same period last year, forecast, benchmark, or a short time series."
- Precision: show $3.84M, not $3,848,305.93.
- Executive dashboard content: key measures vs target and vs prior period, short trend history, plus ranked lists (top-10 issues).
- Layout: most important item top-left; group with white space rather than borders; right-justify numbers.
- Media: bars for comparisons (zero baseline), lines for time series, sparklines for dense history, bullet graphs instead of gauges; avoid pies, radar, bubbles, 3D; label directly.
- Alerts: "Dynamic highlights (alerts, colored icons) appear only when data crosses a threshold. Avoid always-on traffic light icons." Signal severity through intensity of a single hue; pair colour with shape for colour-blind readers.
- Bullet graph: label, scale, featured bar, comparative marker (target), ≤3 qualitative background ranges in one hue. https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf
- Colour rules (2008): consistent background; "Use color only when needed to serve a particular communication goal"; "Use soft, natural colors to display most information and bright and/or dark colors to highlight information that requires greater attention." http://www.perceptualedge.com/articles/visual_business_intelligence/rules_for_using_color.pdf
- ~10% of men and ~1% of women are colour-blind; red/green RAG alone is inaccessible.
- Pre-attentive attributes: 2-D position and length map to quantity; hue has no perceived order. https://www.nngroup.com/articles/dashboards-preattentive/

## 3. Edward Tufte — plus waterfall, stacked-bar, heatmap and exception-flag practice

- Sparklines: "intense, simple, word-sized graphics"; no frames, tic marks; can be placed in sentences and tables. https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/ . Practice: flanking start/end numbers, mark min/max, grey **normal-range band**; aspect ratio banked to ~45°; shared scale when compared.
- Small multiples: "Compared to what?"; "Constancy of design puts the emphasis on changes in data, not changes in data frames." Identical layout, shared axis ranges, meaningful order, all within one eyespan. https://en.wikipedia.org/wiki/Small_multiple
- Slopegraph (VDQI 1983 pp.158–159): read vertically it ranks items at each date; read across it shows change and rate of change and outliers. Practice: names *and* values on both sides, thin light-grey connecting lines, colour only the lines that matter. https://www.edwardtufte.com/notebook/slopegraphs-for-comparing-gradients-slopegraph-theory-and-practice/ ; https://charliepark.org/slopegraphs/
- Data-ink: "Above all else show the data"; "Maximize the data-ink ratio"; "Erase non-data-ink"; "Erase redundant data-ink"; "Revise and edit." https://jtr13.github.io/cc19/tuftes-principles-of-data-ink.html
- Chartjunk: moiré vibration, heavy grids, "ducks".
- Graphical integrity: Lie Factor ≈ 1; "Show data variation, not design variation"; "Write out explanations of the data on the graphic itself. Label important events in the data"; "Graphics must not quote data out of context."
- Tables vs charts: "Tables usually outperform graphics in reporting on small data sets of 20 numbers or less"; order rows by value; "one supertable is far better than a hundred little bar charts".
- FT Visual Vocabulary: deviation → diverging bar; change over time / ranking → slope chart; part-to-whole → waterfall, stacked column (hard with many components); magnitude → column from 0. https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary

**Waterfall / bridge charts**
- "a starting point, increases and decreases, and the resulting ending point" (Knaflic). Headcount bridge = opening → joiners (+) → leavers (−) → closing. https://www.hrknowledgecorner.com/waterfall-chart-employee-head-count/
- Practice: group drivers and show subtotals (5 groups beat 15 bars); a mid-bridge subtotal separates actual from projected moves; distinct colours for +/−/totals; the bridge must reconcile. https://deckary.com/blog/bridge-chart-powerpoint ; https://www.think-cell.com/en/resources/content-hub/a-step-by-step-guide-to-creating-waterfall-charts-in-powerpoint

**100% stacked bars for structure**
- Use only when the *mix* is the message; they hide totals and middle segments are hard to compare (Knaflic). Key segment on the baseline, few segments, consistent order, direct labels; consider a line chart of shares instead. https://www.storytellingwithdata.com/blog/2016/1/12/is-there-a-single-right-answer

**Heatmap tables / scorecards**
- Colour cells convey relative magnitude; keep the numbers in the cells for an executive scorecard; one visual channel per range; sequential status colours = intensities of a single hue. https://www.domo.com/learn/charts/heatmap-chart

**Exception reporting and thresholds**
- Management by exception: only material deviations reach management; thresholds from materiality, historical variability, risk. https://www.accountingtools.com/articles/what-is-management-by-exception.html ; PRINCE2 tolerances: https://prince2.wiki/principles/manage-by-exception/
- Few: highlight *only* when a threshold is crossed; one alert hue, intensity for severity, shape as a second channel.
- Traffic-light problems: react to noise; colour overload makes everything shout. https://www.staceybarr.com/measure-up/3-problems-with-traditional-kpi-traffic-lights/
- Signal vs noise: use time-series with natural process limits (XmR) so only exceptional variation is flagged (Wheeler, *Understanding Variation*). https://xmrit.com/articles/what-makes-wbrs-special/
- Practical synthesis: default state neutral; one red for breached tolerance (lighter/amber for "at risk"); never a sea of green; add glyphs so flags survive greyscale printing.

## 4. Executive-facing report writing and board reporting

**Minto Pyramid Principle / SCQA**
- Ideas at any level summarise the ideas below; same kind of idea in each grouping; logical order. Answer first, then prove it. https://modelthinkers.com/mental-model/minto-pyramid-scqa
- SCQA: Situation → Complication → Question → Answer; for executives put the Answer first. https://managementconsulted.com/pyramid-principle/
- Message headings ("Consolidate committees to improve governance"), not category headings; one conclusion per page, stated in the title.

**Board-pack guidance (Board Intelligence / ICSA)**
- Best packs: **Focus**, **Critical thinking**, **Great communication**. https://www.boardintelligence.com/blog/a-guide-to-creating-effective-board-packs
- Question-Driven Insight: start from the question the board needs answered, then the decision, then the context. https://www.boardintelligence.com/blog/how-to-write-better-board-packs-with-qdi-principle
- Directors allocate ~3–4 hours regardless of pack length and read ~30 pages/hour; 68% rate their materials "weak" or "poor". https://www.boardintelligence.com/finding-the-hidden-cost
- ICSA: packs too long, insufficiently forward-looking, too operational; 3–5 pages "is plenty for almost any topic"; each paper carries a short summary of the action required. https://www.cgi.org.uk/my_cg/technical-archive/icsa-research-into-board-packs
- Executive summary first with the recommendation; answer "Are we on track? Which risks need attention? What decisions are needed?"; supporting material to appendices. https://www.diligent.com/resources/blog/board-pack

**Gartner (abstracts)**
- "Metric and KPI dashboards often lack the required business context and actionability to inform executives' decisions" — remedy: what / so what / now what. https://www.gartner.com/en/documents/4009447
- Executive dashboards are often filled with lagging indicators; add leading/driver metrics. https://www.gartner.com/smarterwithgartner/tune-your-finance-dashboard-using-metrics-to-drive-performance

**Typical exec-dashboard failures and remedies**
- Too many KPIs (30+); numbers without context; no comparison; no owner; no action — remedies: 5–9 KPIs on the primary view, YoY/target context, "every KPI should have a clear owner and response plan". https://www.domo.com/learn/article/what-should-be-on-an-executive-dashboard

**How many top-level KPIs**
- Parmenter's 10/80/10: ~10 key result indicators (board), up to 80 result/performance indicators (management), ~10 true KPIs (front line); exception-based reporting. https://www.fm-magazine.com/news/2012/jan/winning-kpis/
- Kaplan & Norton enterprise scorecards ~20–30 measures (unverified against original). Other bands: 3–10; 5–9 on the primary view; 12–20 total.
- Synthesis for a COO board: ~10–15 tier-1 measures, 3–5 spotlighted, everything else tiered to appendices.

**Comparison baselines and "what changed vs stable"**
- Baselines: plan (PL), prior year (PY), forecast/run-rate (FC), prior period; Few's list (target, same period last year, forecast, benchmark, short time series); Amazon pairs CY vs PY plus goal marker.
- One-page management summary: "the headline result, two or three variances that matter, what has changed in the outlook, and the decisions being asked of the reader"; commentary should "explain, not describe". https://metapraxis.com/blog/management-reporting-guide
- Show "what changed" as variance charts and exception flags; "what is stable" as unflagged sparklines within a normal-range band; escalate only variation outside natural limits.

## 5. Modern executive "brief" formats

- Amazon WBR: three questions; 6-12 chart; targets as markers; max 3 metrics per chart; box scores (LastWk, WOW, YOY, MTD, QTD, YTD); identical design on every page. https://github.com/working-backwards/wbr-app
- Content blocks beyond charts: goal status (RYG), key call-outs, major risks *with owners and resolution dates*, KPI variations outside acceptable ranges, upcoming improvements with dates. https://www.paulmduvall.com/mastering-weekly-business-reviews-insights-from-amazons-iconic-wbr/
- Storytelling with Data (Knaflic): Big Idea in one sentence; 3-minute story; action titles; horizontal logic (titles alone tell the story); everything grey, one accent; "If there is a conclusion you want your audience to reach, state it in words"; bars from zero; slopegraphs for two periods; no pies/donuts/secondary axes/3D.
- Andy Kirk: trustworthy, accessible, elegant. Alberto Cairo: truthful, functional, beautiful, insightful, enlightening.
- Geckoboard: top-left is the most valuable real estate; a number needs context (past data, goal, trend). https://www.geckoboard.com/best-practice/dashboard-design/
- Power BI / Tableau practice: 3–5 spotlighted KPIs per page, one question per page, ~6–12 visuals max; executives get aggregated KPIs.
- Reading order: F-pattern (NN/g) — front-load the message; Gutenberg diagram — primary optical area top-left, terminal area bottom-right. https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
- Slidedocs (Duarte): designed for reading, not projection; words and visuals side by side; each page self-explanatory; ~150–200 words per page. https://www.duarte.com/slidedocs/
- Annotate on the chart: "Write out explanations of the data on the graphic itself. Label important events in the data" (Tufte).

## Checklist: 20 design rules for our exec board
1. **Answer first, in the title.** One-sentence message per page; object title names unit, measure, period. (Minto; IBCS SAY; SWD)
2. **One page, one question; the control panel fits on one page/screen.** (Few; Geckoboard)
3. **No naked numbers.** Each KPI shows AC with at least PL and PY (FC where it exists) and a short trend. (Few; IBCS; WBR)
4. **IBCS scenario notation everywhere:** solid dark = actual, light grey = prior year, hollow = plan, hatched = forecast.
5. **Variances explicit (Δ and Δ%) next to the base chart, coloured by business impact, polarity declared per measure.** (IBCS; Few)
6. **Same scale for the same unit; bars start at zero.** (IBCS CH 4; Tufte; SWD)
7. **Time runs left→right; structure top→bottom.** (IBCS)
8. **Control panel = table + sparklines + bullet graphs; no gauges, pies, donuts, radar, 3D, secondary axes.** (Few; Tufte; IBCS; SWD)
9. **Cap tier-1 KPIs at ~10–15, spotlight 3–5, tier the rest to appendices.** (Parmenter; Domo; Kaplan-Norton)
10. **Manage by exception:** flags only when a tolerance is breached; neutral by default; one alert hue with intensity for severity; glyph for colour-blind/greyscale; never always-on RAG. (Few; PRINCE2; Barr)
11. **Separate signal from noise before flagging:** tolerances from historical variation (XmR); normal-range band on sparklines. (Wheeler; Tufte)
12. **Grey everything; one accent colour for the point of the page.** (SWD; Few)
13. **Compare org units with small multiples: identical design, shared scales, ordered by value.** (Tufte)
14. **Structure change between two periods → slopegraph; mix over time → 100% stacked bar only when mix is the message.** (Tufte/Park; SWD; FT)
15. **Headcount bridges: opening → grouped drivers with subtotals → closing; distinct colours for +/−/totals; must reconcile.**
16. **Decision-level precision; right-aligned numbers; white space instead of gridlines and borders.** (Few; Tufte)
17. **Top-left holds the most important item; the same element sits in the same place on every page.** (Geckoboard; NN/g; WBR)
18. **Narrative beside the chart, never on a separate page: annotate events, state the "so what", give every exception an owner, action and date.** (Tufte; SWD; WBR; Gartner)
19. **Commentary explains rather than describes and is forward-looking: cause, outlook change, decision requested.** (Board Intelligence/ICSA; Metapraxis)
20. **Design for reading, not presenting:** self-sufficient pages of ≤150–200 words, a fixed template, a pack that fits the reading budget (~30 pages/hour). (Duarte; Amazon; Board Intelligence)
