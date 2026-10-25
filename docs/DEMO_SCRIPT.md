# WindSight — Video Demonstration Script & Presentation Plan
**Gridbricks Full-Stack Software Engineering Challenge**
**Total Target Duration:** 10 Minutes (Part 1: 5 Minutes | Part 2: 5 Minutes)
**Presenter Context:** Senior Full-Stack & Energy Analytics Engineer

---

## Overview & Timing Breakdown

| Section | Topic | Allocated Time | Target Run Time |
| :--- | :--- | :--- | :--- |
| **Part 1** | **Customer Presentation (Business Value & Findings)** | **5:00 max** | **0:00 – 4:55** |
| 1.1 | The Wholesale Electricity Purchasing Challenge | 1:00 | 0:00 – 1:00 |
| 1.2 | The January 2026 Decision Context & Cutoff Rules | 0:45 | 1:00 – 1:45 |
| 1.3 | Walkthrough: Wind Generation Intelligence Dashboard | 1:30 | 1:45 – 3:15 |
| 1.4 | Quantitative Findings from Real January 2026 Elexon Data | 1:00 | 3:15 – 4:15 |
| 1.5 | Decision-Support Boundaries & Practical Utility | 0:40 | 4:15 – 4:55 |
| **Part 2** | **Technical Review (Engineering Architecture & Verification)** | **5:00 max** | **4:55 – 9:55** |
| 2.1 | System Architecture & Technology Stack Choices | 0:50 | 4:55 – 5:45 |
| 2.2 | Elexon BMRS Integration (FUELHH & WINDFOR) | 0:50 | 5:45 – 6:35 |
| 2.3 | Decision-Cutoff Engine & Leakage Prevention Logic | 1:00 | 6:35 – 7:35 |
| 2.4 | Accuracy Metric Formulations & Data Quality Handling | 0:45 | 7:35 – 8:20 |
| 2.5 | Automated Testing Suite & Verification Evidence | 0:45 | 8:20 – 9:05 |
| 2.6 | Containerization, Deployment & AI-Tool Disclosure | 0:50 | 9:05 – 9:55 |

---

## Part 1: Customer Presentation (Target: 4:55)

### 1.1 The Wholesale Electricity Purchasing Challenge (0:00 – 1:00)
- **Visual Cue:** Screen shows the WindSight landing view: **Wind Generation Intelligence** with top metrics cards.
- **Speaker Track:**
  > *"Welcome to WindSight — the Wind Forecast Intelligence Platform.
  > As a UK electricity supplier, our client purchases power in the wholesale Day-Ahead auction (such as EPEX SPOT or Nord Pool GB) to meet consumer electricity demand for the following delivery day.
  > Wind power currently generates up to 60% of Great Britain's electricity on windy days, but wind is inherently variable and weather forecasts are imperfect. 
  > If a utility relies on an over-optimistic wind forecast when bidding at gate closure (12:00 UTC day-ahead), they under-contract baseload thermal or flexible power. When actual wind falls short in real time, the supplier is exposed to severe cash-out penalties in the Elexon Balancing Mechanism.
  > Conversely, underestimating wind forces the supplier to over-buy expensive peak power. 
  > WindSight exists to solve this dilemma: it enables energy trading desks to examine the exact forecast vintages that were available at the critical decision cutoff and quantitatively evaluate forecast error tendencies."*

### 1.2 The January 2026 Decision Context & Cutoff Rules (1:00 – 1:45)
- **Visual Cue:** Zoom into the **Filter & Cutoff Configuration Bar**, highlighting Decision Date Range (`2026-01-01` to `2026-01-31`), Day-Ahead Delivery Horizon (`2026-01-02` to `2026-02-01`), and Cutoff selector.
- **Speaker Track:**
  > *"In power trading, timestamps can be deceptive. A forecast published *during* the delivery day is useless for day-ahead purchasing decisions that closed the day before.
  > In WindSight, we strictly evaluate purchasing decisions made during January 2026:
  > - For purchasing decisions made on January 1, the delivery day is January 2.
  > - For decisions made on January 31, the delivery day is February 1.
  > - Every delivery day is divided into 48 standard half-hour settlement periods.
  > WindSight enforces an auditable Day-Ahead Decision Cutoff — by default set to 12:00 UTC on day D-1. Any forecast published *after* this cutoff is strictly rejected to prevent future-data leakage."*

### 1.3 Walkthrough: Wind Generation Intelligence Dashboard (1:45 – 3:15)
- **Visual Cue:** Pan across the 5 Summary Metric Cards, then demonstrate the **Forecast vs Actual Time-Series Chart**, the **Signed Error Bar Chart**, and the **Interval Analysis Table**.
- **Speaker Track:**
  > *"Looking at the dashboard, we see five immediate executive KPIs calculated across all 1,488 half-hour settlement periods in January 2026:
  > 1. **Matched Forecast Intervals:** 1,488 of 1,488 scheduled intervals (100% coverage).
  > 2. **Mean Absolute Error (MAE):** 1,903.81 MW. On average, the day-ahead forecast deviated by 1.9 gigawatts from actual generation.
  > 3. **MAPE:** 19.13%. A healthy relative error rate, with zero-actual intervals properly excluded.
  > 4. **Forecast Bias:** +1,687.22 MW. Day-ahead forecasts exhibited a systematic overforecasting bias.
  > 5. **RMSE:** 2,363.70 MW. 
  > Below the metrics, our interactive time-series chart overlays actual generation (in green) against the selected day-ahead forecast (dashed blue). Using the zoom slider, we can inspect individual ramp events.
  > Below that, our signed error chart highlights overforecasting in amber and underforecasting in blue, with a one-click toggle to view the diurnal hourly error profile."*

### 1.4 Quantitative Findings from Real January 2026 Elexon Data (3:15 – 4:15)
- **Visual Cue:** Highlight the **Key Analytical Intelligence & Findings** panel, clicking into the Peak Volatility dates.
- **Speaker Track:**
  > *"WindSight derives genuine analytical intelligence from the processed Elexon data:
  > - **Systematic Overforecasting:** Day-ahead forecasts in January 2026 overforecasted wind generation by an average of +1,687 MW (15.0% of mean actual generation). For procurement teams, this indicates a tendency for day-ahead bids to assume more wind than actually delivered.
  > - **Peak Volatility Events:** Delivery date **2026-01-11** recorded the month's highest daily error, with an MAE of **4,944.9 MW** — more than double the monthly baseline. Rapid synoptic pressure shifts across Scotland and the North Sea created major ramp forecasting errors.
  > - **Diurnal Uncertainty:** Forecasting uncertainty peaked during the overnight trough at 03:00 UTC (MAE 2,317.5 MW), while stabilizing during afternoon hours."*

### 1.5 Decision-Support Boundaries & Practical Utility (4:15 – 4:55)
- **Visual Cue:** Click the table's **Export to CSV** button to show data export, and reference the footer disclaimer.
- **Speaker Track:**
  > *"WindSight empowers power traders with auditable, high-resolution empirical data. Users can filter by week, adjust cutoffs, audit candidate vintages, and export cleansed CSV records directly into trade valuation models.
  > Crucially, WindSight is an analytical decision-support tool. It equips human traders with historical uncertainty distributions, but does not autonomously execute trades or guarantee financial returns.
  > That concludes Part 1. Let us now examine the technical architecture in Part 2."*

---

## Part 2: Technical Review (Target: 4:55)

### 2.1 System Architecture & Technology Stack Choices (4:55 – 5:45)
- **Visual Cue:** Show the project repository structure and architectural diagram.
- **Speaker Track:**
  > *"Welcome to the technical review of WindSight.
  > The platform follows a decoupled, high-performance architecture:
  > - **Frontend:** Built with React 18, Vite, TypeScript, and Tailwind CSS. We use Recharts for responsive SVG time-series rendering and Lucide for iconography.
  > - **Backend:** Built with Python 3.12, FastAPI, and Pydantic v2. FastAPI provides asynchronous request handling, automatic OpenAPI schema generation, and high throughput.
  > - **Data Processing:** Rather than introducing unnecessary database dependencies, we implemented an in-memory indexing and memoization pipeline that processes over 19,000 raw Elexon records in under 0.6 seconds.
  > - **Containerization:** Production Dockerfiles for both frontend (Nginx multi-stage) and backend (Python slim) managed with Docker Compose."*

### 2.2 Elexon BMRS Integration (5:45 – 6:35)
- **Visual Cue:** Click the **Data Quality** button in the header to display the **Lineage & Matching Diagnostics** modal.
- **Speaker Track:**
  > *"WindSight integrates directly with official Elexon Balancing Mechanism Reporting Service (BMRS) streaming APIs:
  > - Actual generation is retrieved from `/datasets/FUELHH/stream`, filtering strictly for `fuelType == 'WIND'` and preserving the native 30-minute settlement period resolution.
  > - Forecast generation is retrieved from `/datasets/WINDFOR/stream`, capturing both `startTime` (target generation interval) and `publishTime` (forecast publication timestamp).
  > - We handle network resilience through an asynchronous HTTP client with timeout, retry, and verified local cache fallbacks. Data freshness and cache status are clearly surfaced to reviewers."*

### 2.3 Decision-Cutoff Engine & Leakage Prevention Logic (6:35 – 7:35)
- **Visual Cue:** Click the **Audit** button on a row in the table to display the **Forecast Vintage Selection Audit** modal.
- **Speaker Track:**
  > *"Correct forecast selection is the technical core of WindSight.
  > For any delivery interval $T$ on delivery date $D+1$:
  > 1. The decision cutoff is set to date $D$ at the configured cutoff time (e.g. 12:00:00 UTC).
  > 2. All candidate WINDFOR forecasts matching target interval $T$ are evaluated.
  > 3. Any forecast where `publishTime > decision_cutoff` is strictly rejected as future-data leakage.
  > 4. Among eligible forecasts, the selector picks the latest available vintage.
  > 5. As seen in this Audit modal, for interval `2026-01-02 12:00 UTC`, earlier forecasts (e.g., 08:00 UTC) are marked as superseded, the 11:30 UTC forecast is marked as selected, and the 14:00 UTC forecast is explicitly rejected with the reason: 'Published after decision cutoff; future-data leakage prevented.'
  > 6. We also resolve resolution differences: WINDFOR publishes hourly forecasts, while FUELHH operates on 30-minute intervals. WindSight supports both Hourly Block Mapping (the GB day-ahead market convention) and Strict Exact Matching."*

### 2.4 Accuracy Metric Formulations & Data Quality Handling (7:35 – 8:20)
- **Visual Cue:** Display code in `backend/app/services/accuracy_engine.py` or metric definitions.
- **Speaker Track:**
  > *"Our metrics strictly adhere to the challenge specification:
  > - **Signed Error:** $E_i = A_i - F_i$. Negative values indicate overforecasting; positive indicate underforecasting.
  > - **Absolute Error:** $|A_i - F_i|$.
  > - **MAE:** Mean absolute error reported in source megawatts (MW).
  > - **MAPE:** Mean absolute percentage error. Critical engineering rule: intervals with zero actual generation are excluded from MAPE, counted, and reported (`zeroActualExclusions`) to prevent division-by-zero errors.
  > - **Forecast Bias:** Mean($F_i - A_i$). Positive bias reflects overforecasting tendency.
  > - **RMSE:** Root Mean Square Error penalizing volatility.
  > Missing actuals are explicitly flagged as `missing_actual` and are never silently treated as zero."*

### 2.5 Automated Testing Suite & Verification Evidence (8:20 – 9:05)
- **Visual Cue:** Show terminal test execution output showing `17 passed in 2.80s`.
- **Speaker Track:**
  > *"We implemented a comprehensive automated test suite with Pytest covering 17 critical test scenarios:
  > - Forecasts published before cutoff are eligible.
  > - Forecasts published after cutoff are rejected.
  > - Multiple eligible vintages select the latest.
  > - Handling of zero actuals in MAPE without division-by-zero.
  > - Preservation of missing actuals without converting to zero.
  > - January 31 decision targeting February 1 delivery boundary.
  > - Duplicate record deduplication and invalid timestamp handling.
  > - Full FastAPI endpoint schema validation.
  > All 17 tests pass deterministically."*

### 2.6 Containerization, Deployment & AI-Tool Disclosure (9:05 – 9:55)
- **Visual Cue:** Show `Dockerfile`, `docker-compose.yml`, and `README.md` AI disclosure section.
- **Speaker Track:**
  > *"Finally, for infrastructure and deployment:
  > - Both backend and frontend include production-ready Dockerfiles with non-root security principles and multi-stage builds.
  > - Docker Compose enables running the full stack with a single `docker-compose up` command.
  > - Deployment: Frontend is configured for Vercel with SPA rewrite rules; backend runs in Docker or on Render/Heroku.
  > - **AI-Tool Disclosure:** In compliance with the challenge rules, AI coding assistance (Antigravity IDE powered by DeepMind's Gemini 3.8 Flash model) was utilized for scaffolding, rapid test creation, and UI component layout. All domain algorithms, Elexon schema integrations, cutoff logic, and verification were engineered, audited, and tested by the engineer.
  > Thank you for reviewing WindSight!"*

---

## Recording Checklist for Submitter

1. **Audio & Video Setup:**
   - [ ] 1080p minimum resolution, 16:9 aspect ratio.
   - [ ] High-quality microphone, clean audio without echo.
   - [ ] Browser window zoomed to 100% or 110% for crisp readability.
2. **Timing Gate Check:**
   - [ ] Part 1 timer stops at or before 5:00.
   - [ ] Part 2 timer stops at or before 5:00.
   - [ ] Total video duration strictly $\le$ 10:00.
3. **YouTube Settings:**
   - [ ] Visibility set to **Unlisted** (not private, not public).
   - [ ] Title format: `Gridbricks Full-Stack SWE Challenge - WindSight Demonstration`.
   - [ ] Description: Include repository link, architecture summary, and timestamps.
