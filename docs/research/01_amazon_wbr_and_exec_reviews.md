# Research notes: Amazon WBR, 6-pager and other executive-review formats

> Сырые заметки исследовательского агента (на английском), с указанием источников. Синтез на русском — в `docs/01_best_practices.md`.
> Метки: **[read]** = текст прочитан полностью (напрямую или через публичное зеркало); **[snippet]** = доступен только фрагмент из поисковой выдачи; **(unverified)** = по памяти, не подтверждено.

## 1. Amazon's Weekly Business Review (WBR) metrics deck

### 1.1 Scale, cadence, purpose
- **Scale/time-box.** Amazon's S-Team reviews **400–500 metrics in 60 minutes** every Wednesday (**90 min in holiday season**), running since the early 2000s "even when the CEO or CFO is absent" — Commoncog, *The Amazon Weekly Business Review* [read via mirror]: https://commoncog.com/the-amazon-weekly-business-review/ (mirror: https://github.com/coordt/knowledgebase/blob/3a53b25df69e844a41b41ba4b56fb67dc0945ac8/_raw/810443501.md). *Working Backwards* itself cites "200 to 300 metrics in a single hour, reviewed only where there is a notable variance" — Basedash guide [snippet]: https://www.basedash.com/blog/how-to-run-a-weekly-business-review-a-practical-operating-guide
- **Origin = a post-mortem.** The WBR was born from the post-mortem of the disastrous 2000 holiday season; the WBR's purpose was "to provide a more comprehensive lens through which to see the business" (Bryar & Carr, quoted in Commoncog's Goodhart essay) [read via mirror]: https://commoncog.com/goodharts-law-not-useful/
- **The deck answers three questions, in this order:** "1. What did our customers experience last week? 2. How did our business do last week? 3. Are we on track to hit targets?" — "The ordering of the three questions matter." [read via mirror, Commoncog]. The open-source WBR App restates the same three questions [read]: https://github.com/working-backwards/wbr-app
- **Book-level principles (verbatim from ch. 6, via reader notes):** "The deck represents a data-driven, end-to-end view of the business… It's mostly charts, graphs, and data tables… Emerging patterns are a key point of focus… Graphs plot results against comparable prior periods… Graphs show two or more timelines, for example, trailing 6-week and trailing 12-month… Anecdotes and exception reporting are woven into the deck." — Manas Saloi's *Working Backwards* notes [read via mirror]: https://manassaloi.com/booksummaries/2022/06/24/working-backwards-bryar-carr.html

### 1.2 Anatomy of the standard "6-12" chart (concrete spec)
- **Two panels, one x-axis.** "A 6-12 graph presents two graphs on the same X-axis. The graph on the left plots the trailing six weeks of data. The graph on the right plots the entire trailing year month by month." Left panel is "a 'zoomed-in' version of the graph on the right." [read via mirror, Commoncog]
- **Why six weeks, not four:** "Six weeks is chosen because odd things can happen if you stop at a monthly boundary (i.e. four weeks)." [read via mirror, Commoncog]. The book's rationale: "Trend lines for the short term can magnify small but important issues that are hard to spot when averaged out over longer periods." [read via mirror, Saloi notes]
- **Prior-year line + plan markers.** "The faded, pink line in the background is the same metric one year ago. The green triangles represent targets" — targets "set during OP1/OP2 planning… transformed to weekly values by Finance." [read via mirror, Commoncog]. In the Bryar/Carr WBR App, targets are a distinct `line_style: target` that "shows markers only (no line)", prior year is an overlay (`graph_prior_year_flag`, default on), and the docs "Recommend max 3 metrics per chart (primary + secondary + target)." [read]: https://github.com/working-backwards/wbr-app/blob/913dc605ae522e4317dff1882a518b335abf1446/docs/yaml/deck.md
- **Numbers printed on the line.** "Numbers are presented on the line graph itself" [read via mirror, Commoncog]
- **"Box scores" under every chart.** "There is a list of numbers at the bottom of each 6-12 graph; these are referred to as 'box scores'. They provide context for the past week's number" and are the same for every metric [read via mirror, Commoncog]. The WBR App's summary table lists "last week, month-to-date, quarter-to-date, and year-to-date" and auto-generates **WOW/MOM/YOY** comparisons, formatted as `%` or `bps` [read]: https://github.com/working-backwards/wbr-app/blob/913dc605ae522e4317dff1882a518b335abf1446/docs/yaml/metrics.md
- **Rates next to absolutes.** "Colin liked to say that at Amazon, absolute values were often not as important as rates. Many 6-12 Graphs displayed the growth rates of various metrics, typically next to the absolute value." [read via mirror, Commoncog]
- **Chart numbering & page layout.** Each graph is numbered (top-left) for quick reference; printed decks put "four graphs to a landscape page" (the "4-blocker") [read via mirror, Commoncog].
- **Tables where charts overcrowd.** "6-12 tables" for many related series and plain tables for comparisons [read via mirror, Commoncog].
- **Annotations.** The App overlays "business events" as "Noteworthy Events" beneath the relevant chart — known causes are written on the page, not improvised in the room [read]: https://github.com/working-backwards/wbr-app/blob/913dc605ae522e4317dff1882a518b335abf1446/docs/yaml/annotations.md
- **Reference deck order (sample config in the App):** Ad Impressions → Clicks → CTR → Defects/Million → Page Views → section break → "Actual vs Plan" tables (Actual, Plan, Variance to Plan, Variance %, YOY, WOW/MOM) → "YOY Growth Rate" chart [read]: https://github.com/working-backwards/wbr-app/blob/913dc605ae522e4317dff1882a518b335abf1446/src/web/static/demo_uploads/1-wbr-sample-config.yaml

### 1.3 How the deck flows
- **Follow the customer / flywheel.** The deck "is designed to follow the customer experience with Amazon," revealing "the interconnectedness of seemingly independent activities" (book, via Saloi notes) [read via mirror]. Amazon "looks at the same set of data every week, in the same order" [snippet]: https://medium.com/@SoyakaAI/working-backwards-516d257c2343
- **Inputs before outputs, finance frames it.** "controllable input metrics at the start of the deck, corresponding output metrics immediately after; and then rinse and repeat… for each major initiative or department, ending with financial metrics" [snippet]: https://commoncog.com/the-amazon-weekly-business-review/
- **Cadence around the deck.** Metrics generated Sunday night; owners review Monday; departmental WBRs Tuesday; company WBR Wednesday [read via mirror, Commoncog]. https://www.paulmduvall.com/mastering-weekly-business-reviews-insights-from-amazons-iconic-wbr/

### 1.4 How the review runs
- **Exception-based by default.** "If the metric shows only routine variation, the owner will say 'nothing to see here'; everyone stares at the graph for one second, and then the entire meeting moves on to the next graph." [read via mirror, Commoncog]. Book: "The goal of the meeting is to discuss exceptions and what is being done about them. The status quo needs no elaboration."
- **Owners, not Finance, explain variance.** "the owners, not the finance team, are expected to provide a crisp explanation for variances against expectations… discussing what action they plan to take" [read via mirror, Saloi notes]. "Every metric has an owner, and every metrics owner is expected to understand what is normal variation and what is an anomaly" [snippet, Commoncog]
- **No improvising; "I don't know" is allowed, bluffing is not.** Owners either present findings or mark for follow-up; "expected to follow up in writing after the meeting" [snippet]: https://rowzero.com/blog/weekly-business-review
- **Speed discipline.** "Handoff between each metrics owner should occur under two seconds. The WBR deck is static… Waiting precious seconds for dashboards to load… is simply unacceptable." [read via mirror, Commoncog]
- **Operational, not strategic; facilitator takes tangents offline.** [read via mirror / snippet, Commoncog]
- **Closed loop.** "The WBR forces you to say what you're going to do. And next week, you'll be asked whether you did it." [snippet]: https://insightextractor.com/2025/04/07/why-your-amazon-style-wbr-isnt-working-and-how-to-fix-it/
- **Finance certifies and audits the numbers.** [snippet]: https://www.holistics.io/blog/how-amazon-measures/ ; "unless you have a regular process to independently validate the metric, assume that over time something will cause it to drift" (book, via Commoncog)
- **Attendance and tone rules.** Bloated attendee lists and ballooning metric counts were the failure mode; fix: limited attendance, pruned metrics, "a balance between extremely high standards and an atmosphere where people feel comfortable talking about mistakes." [read via mirror, Commoncog]
- **Dive Deep.** "Leaders operate at all levels, stay connected to the details, audit frequently, and are skeptical when metrics and anecdotes differ." [snippet]: https://www.agile-academy.com/en/agile-leader/amazon-leadership-principles/

### 1.5 Controllable input metrics vs output metrics; DMAIC
- **Definitions.** Output metrics (share price, revenue) — "very little ability to directly control"; input metrics "track things like selection, price, or convenience—factors that Amazon can control" [read via mirror, Saloi notes]. Output metrics are reported "but not discussed operationally" [read via mirror, Commoncog]
- **Iterate to the right input (Fast Track In Stock).** "number of detail pages" → "detail page views" → "% of views in stock" → "% of detail page views where the products were in stock and immediately ready for two-day shipping" [snippet]: https://www.holistics.io/blog/how-amazon-uses-input-metrics/
- **DMAIC as the metric-selection method.** [snippet]: https://workingbackwards.com/blog/using-six-sigma-and-dmaic-to-improve-amazon-operations/ ; "In some Amazon teams, metrics are so well controlled… that the WBR becomes an exception-based meeting" [snippet, Holistics]
- **The classic failure = skipping D-M-A.** "Many of the teams had skipped the first three DMAIC steps… and chased blips on a graph with not much to show for their effort." [read via mirror, Commoncog quoting the book]
- **"What could we have tracked?"** — Bezos's post-incident question that seeds new deck metrics [read via mirror, Commoncog]
- **Metric count is a living decision.** "There is no magic number or formula… modify, add, and remove metrics based on the strength and quality of the signal each emits." [read via mirror, Saloi notes]

### 1.6 Anecdotes, exception reports, and the error-correction loop
- **Two tools woven into the deck:** anecdotes and exception reporting [read via mirror, Saloi notes]
- **Voice of the Customer page.** CS inserts stories that reveal pain points rather than the most frequent complaints [read via mirror, Commoncog]
- **Bezos's rule of thumb.** "When the data and the anecdotes disagree, the anecdotes are usually right… it's usually that you're not measuring the right thing" [snippet]: https://www.forbes.com/sites/rogerdooley/2024/12/09/a-two-minute-masterclass-from-jeff-bezosfive-powerful-insights/
- **"?" escalation.** Bezos forwards customer complaints with a single "?" [snippet]: https://www.inc.com/business-insider/amazon-founder-ceo-jeff-bezos-customer-emails-forward-managers-fix-issues.html
- **Correction of Error (COE).** ≤6-page document: issue, root cause (Five Whys), long-term fix; reviewed at VP/CEO level [snippet]: https://workingbackwards.com/blog/amazons-correction-of-error-process-for-lasting-improvement/ ; AWS's public version: https://aws.amazon.com/blogs/mt/creating-a-correction-of-errors-document/

### 1.7 Seasonality, averages, variation
- **Apples-to-apples periods.** "Care is taken to ensure that prior periods are structured to provide apples-to-apples comparisons" [read via mirror, Saloi notes]. Prior-year overlay + YoY in every box score is the built-in seasonal control.
- **Averages.** No verbatim "avoid averages" rule found in the book (unverified). Verified: short-term trend lines surface issues "hard to spot when averaged out over longer periods"; growth rates shown beside absolutes.
- **Signal vs noise.** Commoncog notes the WBR "does not use process behaviour charts of any type" and recommends XmR charts to make "exceptional variation" objective [snippet]: https://commoncog.com/becoming-data-driven-first-principles/ ; https://commoncog.com/process-behaviour-charts-more-than-you-need/
- **Log scales:** no reliable source found (unverified).

### 1.8 Design rules and typical mistakes
- **Consistency rule (verbatim).** "A good deck uses a consistent format throughout—the graph design, time periods covered, color palette, symbol set (for current year/prior year/goal), and the same number of charts on every page wherever possible… anomalies stand out more distinctly, and the meeting runs more efficiently." [read via mirror, Saloi notes]. Palette note: black current year, grey prior year, grey dashed YoY growth [read via mirror]: https://matthewkudija.com/reading-notes/2023-06-02-Working-Backwards.html
- **Zero cognitive load.** "Because every metric is graphed similarly, there is zero cognitive load… the brain is focused on the information." [snippet]
- **Mistakes named in sources:** chasing noise after skipping D-M-A; "bridging a metric" becoming a blame game; bloated attendance; ballooning metrics; tangents on "a blip on the data"; reviewing output metrics without identified inputs; live dashboards instead of a static deck.

### 1.9 Amazon's *monthly* equivalent (most relevant to a monthly board)
- Amazon pairs the WBR with **monthly/quarterly business reviews (MBR/QBR)** and OP1/OP2 planning [snippet]: https://workingbackwards.com/concepts/amazon-operating-cadence/
- The MBR is a **written narrative "6 pages or fewer + additional tables in the appendix"** with the same structure every month: "metrics, recap and explain results, describe progress on initiatives, update on the organization"; for each initiative "describe the results in analytical terms, explain what you have learned and next steps" [snippet]: https://workingbackwards.com/concepts/quarterly-monthly-business-reviews/
- Goal tracking uses **green/yellow/red** with quarterly reviews of misses; Amazon expects only ~75% of S-Team goals to be hit [read via mirror, Commoncog quoting the book]

## 2. Amazon's six-page narrative memo
- **The founding rule (Bezos email, June 9, 2004):** "Well structured, narrative text is what we're after rather than just text. If someone builds a list of bullet points in word, that would be just as bad as powerpoint. The reason writing a good 4 page memo is harder than 'writing' a 20 page powerpoint is because the narrative structure of a good memo forces better thought and better understanding of what's more important than what, and how things are related." https://finance.yahoo.com/news/2004-email-jeff-bezos-explains-182123490.html
- **Why six pages.** "People read complex information at the rough average of three minutes per page… about six pages for a 60-minute meeting." [read via mirror, Saloi notes]
- **Information density argument.** PowerPoint "an average of just 440 characters per page" vs 3,000–4,000 in Word — "seven to nine times the information density." [read via mirror, Saloi notes]
- **Read in silence, in the room.** ~20 minutes of silent reading at the start [snippet]: https://www.cnbc.com/2018/04/23/what-jeff-bezos-learned-from-requiring-6-page-memos-at-amazon.html
- **Presenter does not walk through it.** "Resist that temptation; it will likely be a waste of time." Notes taken by a non-presenter [read via mirror, Saloi notes]
- **Reading stance.** Bezos "assumes each sentence he reads is wrong until he can prove otherwise"; "Silence in the discussion stage is the equivalent of agreement" [read via mirror, Saloi notes]
- **Structure of a business-review six-pager:** Introduction, Tenets, Accomplishments, Misses, Proposals for Next Period, Headcount, P&L, FAQ, Appendices [read via mirror, Saloi notes]
- **Practitioner anatomy (Jesse Freeman):** Introduction, Goals, Tenets, State of the Business, Lessons Learned ("numbers, percentages of goal completion… zero room for interpretation"), Strategic Priorities (50–70%); 10-point font; appendix; printed, laptops closed; the doc must "stand on its own" [read via mirror]: https://writingcooperative.com/the-anatomy-of-an-amazon-6-pager-fc79f31a41c9
- **FAQ discipline.** "The FAQ should be five pages or less"; strong narratives "anticipate counterarguments, points of contention, or statements that might be easily misinterpreted." [read via mirror, Saloi notes]
- **Why executives like it (Brad Porter):** "A great document enables our senior executives to internalize a whole new space… in 30 minutes of reading" [snippet]: https://www.linkedin.com/pulse/beauty-amazons-6-pager-brad-porter
- **Effort expectation (Bezos, 2017 letter):** great memos "are written and re-written… it might take a week or more" [snippet]: https://www.aboutamazon.com/news/company-news/2017-letter-to-shareholders
- **Full-sentence rule:** "Full sentences are harder to write. They have verbs. The paragraphs have topic sentences. There is no way to write a six-page, narratively structured memo and not have clear thinking." [snippet]: https://slab.com/blog/jeff-bezos-writing-management-strategy/

## 3. Other well-documented executive review formats
- **Sequoia "Preparing a Board Deck" (Bryan Schreier).** Big Picture 15 min (highlights, lowlights, where the company needs help) → Calibration 45–60 min (metrics vs plan and forecast) → Company Building 30 min → Working session → Closed session. "picking the fewest number of correct metrics/charts to properly frame the current status"; distribute 1–2 days ahead; board decks "don't actually have to be decks". https://articles.sequoiacap.com/preparing-a-board-deck ; PDF: https://conferences.law.stanford.edu/vcs2020/wp-content/uploads/sites/79/2019/10/Sequoia-Preparing-a-Board-Deck.pdf . A Sequoia artifact called "the five things" was not found (unverified).
- **Netflix memo governance.** Board memos "approximately 30-page online memos in narrative form that include links to supporting analysis"; directors "spend twice as long preparing… but meetings are often shorter" https://corpgov.law.harvard.edu/2018/05/10/netflix-approach-to-governance-genuine-transparency-with-the-board/
- **Bridgewater.** *Daily Observations* since 1975; internal *Daily Update* and *Issue Log* ("if something went badly, you had to put it in the log, characterize its severity, and make clear who was responsible") https://www.bridgewater.com/50-years-of-the-bridgewater-daily-observations ; https://www.principles.com/
- **Toyota A3.** One page, PDCA left-to-right: background, current condition, goal, root-cause (left); countermeasures, plan, follow-up (right); the boss mentors by asking questions https://asq.org/quality-resources/a3-report ; https://sloanreview.mit.edu/article/toyotas-secret-the-a3-report/
- **Andy Grove, *High Output Management*.** "pairing indicators, so that together both effect and counter-effect are measured"; the stagger chart (successive forecasts vs actuals) — "the most valuable indicator of business trends that I have ever seen"; operation reviews: "four minutes of presentation and discussion time per visual aid" https://tomtunguz.com/groves-stagger-chart/
- **Ben Horowitz.** 1:1 question list ("What's the number-one problem with our organization? Why?… If you were me, what changes would you make?…") https://a16z.com/one-on-one/
- **Management by exception (Taylor, *Shop Management*, 1911):** "the manager should receive only condensed, summarized, and invariably comparative reports… and have all of the exceptions to the past averages or to the standards pointed out, both the especially good and especially bad exceptions" https://www.gutenberg.org/ebooks/6464
- **Google OKRs.** 0.0–1.0 grading, sweet spot 60–70%; owners explain grades quarterly https://rework.withgoogle.com/intl/en/guides/set-goals-with-okrs
- **Stripe.** Memo-driven, long-form writing over slides https://slab.com/blog/stripe-writing-culture/
- **Shopify (Tobi Lütke).** "The moment a metric becomes a goal, it's no longer a useful metric"; analytics as "a cockpit for a pilot" https://www.lennysnewsletter.com/p/tobi-lutkes-leadership-playbook
- **Uber.** Weekly review of global trip growth (WoW) with highlights/lowlights/priorities https://trailruncapital.substack.com/p/ops-excellence-series-lessons-from
- **McKinsey / Minto.** Answer first (pyramid), SCQA, MECE; "action titles" are full sentences — "a reader should be able to follow the argument from the slide titles alone" https://www.mckinsey.com/alumni/news-and-events/global-news/alumni-news/barbara-minto-mece-i-invented-it-so-i-get-to-say-how-to-pronounce-it

## 4. "Questions the executive should ask" — documented hook practices
- **Amazon's three standard WBR questions:** "1. Is this metric worth discussing? 2. If this is a controllable input metric, is this the right input metric? 3. …how is it measured?" [read via mirror, Commoncog]
- **"What could we have tracked?"** — Bezos's post-incident question [read via mirror, Commoncog]
- **Owner-side answers must be pre-written.** Owners "review the deck before the WBR and respond by discussing what action they plan to take" [read via mirror, Saloi notes]
- **Skepticism trigger.** Dive Deep: "skeptical when metrics and anecdotes differ"; the "?" forward and the Andon button are institutionalized "why is this happening?" hooks
- **Five Whys / COE** for any material miss
- **Sequoia's calibration questions:** "Are you executing? Are you innovating? Are you hiring?… according to the last plan you laid out? And is that plan still good enough to win?" https://www.occasionallyuseful.com/f-resources/preparing-a-board-deck-by-bryan-schreier-at-sequoia
- **"What's keeping me up at night / how you can specifically help"** — concrete asks; "ended up being the most meaningful part of board meetings" https://medium.com/@adjblog/board-deck-template-for-seed-stage-startups-e347900549c2
- **A3 coaching questions** (Shook): problem now? owner? root cause? countermeasures? how chosen? proof?
- **Grove's operation review:** the senior manager exists "to ask questions and act as a role model"
- **Minto's "so what?" test:** every headline must state the implication, not the topic
- **FAQ as pre-answered questions:** the author writes the executive's likely questions and answers them in advance
- **Taylor:** point out exceptions "both the especially good and especially bad"

## 5. Design rules to steal for a monthly exec board
1. **Same charts, same order, every month.** (*Working Backwards*)
2. **One standard chart: zoomed recent window + long window on one x-axis** (6-12 adapted to monthly). (Commoncog; WBR App)
3. **Overlay prior year faded; show plan as markers only; max three series per chart.** (Commoncog; WBR App)
4. **Box scores under every chart:** last period, MTD/QTD/YTD, WoW/MoM/YoY, variance to plan. (Commoncog; WBR App)
5. **Print the numbers on the line; static pages, no live dashboards; number every chart.** (Commoncog)
6. **Show growth rates next to absolutes.** (Bryar via Commoncog)
7. **Order = customer experience → inputs → outputs → financials.** (Commoncog; *Working Backwards*)
8. **Inputs, not outputs, get the airtime.** (*Working Backwards* DMAIC)
9. **Exception-based by default; define "exception" objectively** (prior-year/plan bands or XmR limits). (Commoncog; Wheeler)
10. **One owner per metric, variance commentary written before the meeting.** (*Working Backwards*)
11. **Finance certifies and can audit every number.** (Bryar & Carr)
12. **Anecdotes beside metrics.** (Bezos; *Working Backwards*)
13. **Apples-to-apples periods for seasonality; lean on YoY.** (*Working Backwards*)
14. **Pair every indicator with its counter-indicator.** (Grove)
15. **Add a stagger chart for forecasts.** (Grove)
16. **Wrap the charts in a fixed-structure ≤6-page narrative, read in silence at the start.** (*Working Backwards*; MBR)
17. **Every page title states the so-what, not the topic.** (Minto/McKinsey)
18. **A standing "Highlights / Lowlights / Where I need help" block with concrete asks.** (Sequoia)
19. **Operational vs strategic separation and a hard time-box; follow-up log reviewed next month.** (Commoncog)
20. **Report exceptions in both directions and ask "what could we have tracked?" after every surprise.** (Taylor; Bezos)

Caveats: Commoncog's WBR essays were read through a public mirror or search snippets; "log scales" and a literal "avoid averages" rule could not be sourced; a Sequoia "five things" artifact was not found.
