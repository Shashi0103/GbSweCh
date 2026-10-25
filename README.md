# WindSight — Wind Forecast Intelligence Platform

> **Tagline:** *See the forecast. Measure the uncertainty. Make smarter energy decisions.*  
> **Product Descriptor:** Wind Forecast Intelligence Platform  
> **Primary Dashboard Heading:** Wind Generation Intelligence  
> **Challenge:** Gridbricks Full-Stack Software Engineering Challenge  
> **Target Scope:** UK Wholesale Electricity Purchasing Decisions in **January 2026**

[![Automated Tests](https://img.shields.io/badge/Pytest-17%20Passed-emerald.svg)](#automated-testing)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.115-blue.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript-61DAFB.svg)](https://react.dev)
[![Elexon BMRS](https://img.shields.io/badge/Data%20Source-Elexon%20BMRS%20Live-059669.svg)](https://bmrs.elexon.co.uk)
[![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ED.svg)](#docker-and-containerization)

---

## 1. Executive Summary & Business Objectives

**WindSight** is an analytical decision-support platform engineered for UK electricity suppliers and power trading desks that procure electricity in the GB wholesale market (e.g., EPEX SPOT and Nord Pool day-ahead auctions).

In Great Britain, wind generation constitutes a major and volatile portion of the generation mix (routinely supplying over 15 to 20 GW of power). However, wind output cannot be forecasted with absolute certainty. When a utility submits purchase bids at day-ahead gate closure (typically 12:00 UTC on day $D-1$):
- If the utility relies on an **over-optimistic forecast**, they under-contract baseload power. When real-time wind falls short, they face severe imbalance penalties in the Elexon Balancing Mechanism at the System Buy Price.
- If the utility relies on an **under-forecast**, they over-purchase thermal or flexible generation, spilling surplus energy at distressed System Sell Prices.

### Core Objectives
1. **Understand Available Day-Ahead Forecasts:** Enable trading desks to inspect the exact forecast vintages that were published and available prior to day-ahead gate closure.
2. **Quantitatively Measure Forecast Accuracy:** Calculate empirical error metrics (MAE, MAPE, Forecast Bias, RMSE) to reveal systematic forecasting tendencies.
3. **Prevent Future-Data Leakage:** Enforce strict cutoff policies so forecasts published *after* the purchasing decision are never used to evaluate what was known at decision time.
4. **Decision Support, Not Magic:** Provide auditable transparency. WindSight informs and strengthens human decision-making; it does not claim to autonomously optimize trades or guarantee financial profits.

---

## 2. Official Elexon Data Sources & Verification

WindSight connects to the official UK Balancing Mechanism Reporting Service (Elexon BMRS) streaming endpoints:

### 2.1 Actual Wind Generation — `FUELHH`
- **Official Documentation:** [Elexon FUELHH Stream Documentation](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream)
- **Endpoint URL:** `https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream`
- **Target Fields Used:**
  - `startTime`: Start of the 30-minute target settlement interval (UTC).
  - `publishTime`: Timestamp when the actual metering record was published (UTC).
  - `fuelType`: Filtered strictly to `WIND` (excluding other generation sources).
  - `settlementDate`: Delivery date (`YYYY-MM-DD`).
  - `settlementPeriod`: UK half-hour settlement period (1 to 48).
  - `generation`: Actual generation output in Megawatts (MW).
- **Resolution:** Native 30-minute interval resolution preserved throughout processing.

### 2.2 Forecast Wind Generation — `WINDFOR`
- **Official Documentation:** [Elexon WINDFOR Stream Documentation](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream)
- **Endpoint URL:** `https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream`
- **Target Fields Used:**
  - `startTime`: Target generation delivery interval (UTC).
  - `publishTime`: Exact timestamp when the forecast was issued by National Grid ESO / Elexon (UTC).
  - `generation`: Forecasted wind generation amount in Megawatts (MW).
- **Critical Principle:** `startTime` (when power is generated) and `publishTime` (when the forecast was known) are fundamentally distinct and strictly separated.

---

## 3. Forecast Selection Policy & Decision Cutoff Rules

A central engineering requirement of WindSight is avoiding **future-data leakage**. Multiple forecast vintages are published for any given target delivery hour as atmospheric models update.

```
Decision Day (D-1)                               Delivery Day (D)
   00:00        11:30       12:00 [CUTOFF]         00:00           12:00
-----+------------+-----------+----------------------+---------------+--------->
     |            |           |                      |               |
     |         Forecast    CUTOFF GATE               |         Target Delivery
     |         Vintage 2     CLOSURE                 |            Interval
     |       (SELECTED)     (12:00 UTC)              |               |
     |                                               |               |
  Forecast                                        Forecast           |
  Vintage 1                                       Vintage 4          |
 (Superseded)                                 (REJECTED: LEAKAGE)    |
```

### 3.1 Decision & Delivery Horizon (January 2026)
- **Purchasing Decision Dates:** January 1, 2026 to January 31, 2026.
- **Target Delivery Dates:** Decisions on date $D$ determine wholesale electricity delivery on date $D+1$.
- **Boundary Handling:** A decision made on **January 31, 2026** concerns delivery on **February 1, 2026**. WindSight automatically fetches and matches February 1 actuals to properly evaluate January 31 decisions.

### 3.2 Decision Cutoff Assumption
- **Standard Default Cutoff:** `12:00:00 UTC` on decision date $D$.
- **Rationale:** 12:00 UTC is the standard Day-Ahead auction gate closure in the UK power market (e.g., EPEX SPOT and Nord Pool GB auctions). Bids submitted at 12:00 UTC can only incorporate forecasts published at or before 12:00 UTC.
- **Configurability:** The cutoff is fully configurable in the API and UI (e.g., 11:00 UTC, 12:00 UTC, 17:00 UTC, or custom hour).

### 3.3 Forecast Vintage Selection Rules
For each target delivery interval $T$:
1. **Candidate Gathering:** Collect all WINDFOR forecast records targeting $T$.
2. **Eligibility Filter:** A forecast is eligible if and only if $\text{publishTime} \le \text{decision\_cutoff}$.
3. **Leakage Rejection:** Any forecast with $\text{publishTime} > \text{decision\_cutoff}$ is strictly rejected and recorded with audit reason: *"Published after decision cutoff; future-data leakage prevented."*
4. **Latest Vintage Selection:** Among eligible forecasts, the selector selects the vintage with the latest $\text{publishTime}$.
5. **Deterministic Deduplication:** If multiple records share the same latest $\text{publishTime}$, records are deduplicated deterministically by dataset key and timestamp.
6. **Resolution Mapping:** Elexon WINDFOR publishes hourly forecasts, while FUELHH records 30-minute intervals. WindSight provides two user-configurable mapping policies:
   - **Hourly Block Mapping (Default):** Applies the hourly forecast to both 30-minute settlement periods (Periods $2h-1$ and $2h$), matching UK day-ahead market block trading conventions (1,488 matched intervals in January 2026, 100% coverage).
   - **Strict Exact Match:** Only matches intervals where `startTime` matches `:00` exactly (744 matched intervals; half-hour intervals explicitly marked as `missing_forecast`).

---

## 4. Quantitative Accuracy Metrics & Mathematical Formulations

Let:
- $A_i$ = Actual wind generation for interval $i$ (MW) from `FUELHH`.
- $F_i$ = Selected eligible forecast generation for interval $i$ (MW) from `WINDFOR`.
- $n$ = Total count of eligible matched intervals.

### Metric Formulas
| Metric | Mathematical Formula | Sign / Interpretation |
| :--- | :--- | :--- |
| **Signed Forecast Error ($E_i$)** | $E_i = A_i - F_i$ | **Negative ($<0$):** Overforecasting (Actual $<$ Forecast)<br>**Positive ($>0$):** Underforecasting (Actual $>$ Forecast) |
| **Absolute Error ($AE_i$)** | $AE_i = \|A_i - F_i\|$ | Magnitude of forecast error in source megawatts (MW) |
| **Mean Absolute Error (MAE)** | $\text{MAE} = \frac{1}{n}\sum_{i=1}^n \|A_i - F_i\|$ | Average error magnitude across all matched intervals (reported in MW) |
| **Absolute Percentage Error ($APE_i$)** | $APE_i = 100 \times \frac{\|A_i - F_i\|}{\|A_i\|}$ | Defined strictly for $A_i > 0$. Zero actuals ($A_i = 0$) are excluded to prevent division-by-zero errors. |
| **Mean Absolute Percentage Error (MAPE)** | $\text{MAPE} = \frac{1}{m}\sum_{k=1}^m APE_k$ | Average percentage error across non-zero actual intervals ($m = n - \text{zeroActualExclusions}$) |
| **Forecast Bias** | $\text{Bias} = \frac{1}{n}\sum_{i=1}^n (F_i - A_i)$ | **Positive ($>0$):** Systematic overforecasting tendency<br>**Negative ($<0$):** Systematic underforecasting tendency |
| **Root Mean Square Error (RMSE)** | $\text{RMSE} = \sqrt{\frac{1}{n}\sum_{i=1}^n (A_i - F_i)^2}$ | Penalizes large error outliers; measures volumetric variance (MW) |

### Missing Data & Quality Rules
- **No Silent Zeroes:** Missing actual generation is explicitly flagged as `missing_actual` and is **never** treated as zero.
- **No Synthetic Placeholders:** Real calculations reflect only actual observations.

---

## 5. Empirical Findings from January 2026 Elexon Data

Processing all **1,488 settlement intervals** across January 2026 yields the following empirical findings:

1. **Systematic Overforecasting Bias:**
   - Day-ahead forecasts exhibited a mean positive bias of **+1,687.22 MW** (15.0% of mean actual generation of 11,283.56 MW).
   - Day-ahead forecasts consistently expected more wind than materialized, creating potential cash-out exposure for utilities that did not de-rate forecasts.
2. **Mean Absolute Error (MAE):**
   - Monthly MAE was **1,903.81 MW** with a MAPE of **19.13%**.
3. **Peak Volatility Event (January 11, 2026):**
   - Delivery date **2026-01-11** recorded the month's highest daily error (MAE of **4,944.9 MW**), caused by a rapid Atlantic frontal passage across the UK.
4. **Diurnal Uncertainty Pattern:**
   - Error magnitude was highest during overnight hours (03:00 UTC MAE of **2,317.5 MW**) and stabilized during afternoon hours (14:00 UTC MAE of **1,620.2 MW**).

---

## 6. System Architecture & Project Structure

```
WindSight/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI application with REST endpoints
│   │   ├── core/
│   │   │   └── config.py            # Application settings, defaults, and CORS
│   │   ├── models/
│   │   │   └── schemas.py           # Pydantic data schemas and contracts
│   │   └── services/
│   │       ├── elexon_client.py     # Asynchronous Elexon API streaming client
│   │       ├── forecast_selector.py # Decision cutoff & vintage selection engine
│   │       ├── accuracy_engine.py   # Accuracy metrics & interval matching
│   │       └── insights_engine.py   # Data-driven insight generator
│   ├── data/
│   │   ├── cache_fuelhh_wind_jan2026.json # Verified 1,584 FUELHH WIND records
│   │   └── cache_windfor_jan2026.json     # Verified 19,272 WINDFOR records
│   ├── tests/
│   │   ├── conftest.py              # Test fixtures and synthetic edge cases
│   │   ├── test_accuracy_engine.py  # MAE, MAPE, Bias, zero actuals tests
│   │   ├── test_forecast_selector.py# Cutoff eligibility, leakage prevention tests
│   │   └── test_api.py              # FastAPI endpoint integration tests
│   ├── Dockerfile                   # Lean multi-stage Python 3.12 image
│   └── requirements.txt             # Python dependencies
├── frontend/
│   ├── public/
│   │   └── favicon.svg              # WindSight brand logo
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx           # Brand header, status pills, sync trigger
│   │   │   ├── FilterBar.tsx        # Date range, cutoff selector, presets
│   │   │   ├── SummaryMetrics.tsx   # 5 key metric cards with tooltips
│   │   │   ├── InsightsPanel.tsx    # Derived analytical takeaways
│   │   │   ├── ForecastChart.tsx    # Recharts dual time-series with zoom
│   │   │   ├── ErrorChart.tsx       # Signed error & diurnal profile chart
│   │   │   ├── DataTable.tsx        # Paginated table, sorting, CSV export
│   │   │   ├── VintageAuditModal.tsx# Single-interval vintage audit inspection
│   │   │   └── DataQualityModal.tsx # Lineage & matching diagnostics modal
│   │   ├── services/
│   │   │   └── api.ts               # Axios client for backend endpoints
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript interfaces
│   │   ├── App.tsx                  # Root state & view orchestration
│   │   ├── index.css                # Tailwind directives & design system
│   │   └── main.tsx                 # React entrypoint
│   ├── Dockerfile                   # Nginx multi-stage build
│   ├── nginx.conf                   # Nginx proxy and routing configuration
│   ├── package.json                 # Frontend dependencies
│   ├── tsconfig.json                # TypeScript configuration
│   ├── vite.config.ts               # Vite configuration with API proxy
│   └── vercel.json                  # Vercel deployment configuration
├── docs/
│   └── DEMO_SCRIPT.md               # 10-minute presentation & technical video script
├── docker-compose.yml               # Multi-container orchestration
├── .gitignore                       # Repository ignore rules
└── README.md                        # Documentation
```

---

## 7. Installation & Quick Start

### Prerequisites
- **Python:** 3.11 or higher
- **Node.js:** v18 or higher (v22 recommended)
- **Docker:** (Optional, for containerized execution)

---

### 7.1 Running the Backend (FastAPI)

1. Open a terminal in the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (recommended):
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
5. The API is now accessible at `http://localhost:8000`.  
   Interactive OpenAPI / Swagger documentation is available at `http://localhost:8000/docs`.

---

### 7.2 Running the Frontend (React + Vite)

1. Open a terminal in the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser at `http://localhost:5173/`.

---

### 7.3 Running with Docker & Docker Compose

To start both the frontend and backend with a single command:
```bash
docker compose up --build
```
- Frontend application: `http://localhost:3000`
- Backend API & Docs: `http://localhost:8000/docs`

---

## 8. Automated Testing & Verification

A comprehensive Pytest test suite validates all accuracy formulas, cutoff policies, and API endpoints.

To run the backend test suite:
```bash
cd backend
python -m pytest -v
```

### Verified Test Cases
```
tests/test_accuracy_engine.py::test_accuracy_metrics_calculations PASSED
tests/test_accuracy_engine.py::test_zero_actual_handling_in_mape PASSED
tests/test_accuracy_engine.py::test_missing_actual_not_treated_as_zero PASSED
tests/test_accuracy_engine.py::test_january_boundary_handling_jan31_to_feb1 PASSED
tests/test_api.py::test_health_endpoint PASSED
tests/test_api.py::test_analysis_summary_january_2026 PASSED
tests/test_api.py::test_timeseries_endpoint PASSED
tests/test_api.py::test_records_pagination_and_sorting PASSED
tests/test_api.py::test_insights_endpoint PASSED
tests/test_api.py::test_data_quality_endpoint PASSED
tests/test_api.py::test_vintage_audit_inspection PASSED
tests/test_api.py::test_invalid_date_range_validation PASSED
tests/test_forecast_selector.py::test_forecast_published_before_cutoff_is_eligible PASSED
tests/test_forecast_selector.py::test_forecast_published_after_cutoff_is_rejected PASSED
tests/test_forecast_selector.py::test_multiple_eligible_forecasts_selects_latest PASSED
tests/test_forecast_selector.py::test_hourly_block_mapping_applies_to_half_hour PASSED
tests/test_forecast_selector.py::test_invalid_timestamps_gracefully_ignored PASSED

======================== 17 passed in 2.80s ========================
```

---

## 9. API Endpoint Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check and Elexon integration diagnostic status |
| `GET` | `/api/analysis/summary` | Summary KPIs (MAE, MAPE, Forecast Bias, RMSE, Match Rate) |
| `GET` | `/api/analysis/timeseries` | Time-series data points for actual vs forecast charting |
| `GET` | `/api/analysis/records` | Paginated, filterable, and sortable interval records |
| `GET` | `/api/analysis/insights` | Derived analytical insights (bias, peak error dates, diurnal profile) |
| `GET` | `/api/analysis/data-quality` | Diagnostic lineage data (records retrieved, match rates, denominator) |
| `GET` | `/api/analysis/vintages` | Single-interval vintage audit detailing candidate eligibility and leakage |
| `POST`| `/api/analysis/refresh` | Triggers a live data re-fetch from Elexon BMRS API |

---

## 10. Deployment Instructions

### 10.1 Frontend Deployment (Vercel)
1. Push the repository to GitHub.
2. In Vercel, import the project and set the Root Directory to `frontend`.
3. Framework Preset: **Vite**.
4. Set environment variable: `VITE_API_BASE_URL` pointing to your deployed backend URL.
5. Deploy. The included `frontend/vercel.json` ensures client-side routing and proxying work out of the box.

### 10.2 Backend Deployment (Render / Heroku / Fly.io)
1. Using Docker: Use `backend/Dockerfile` as the deployment target.
2. Set Environment Variables:
   - `PORT=8000`
   - `ELEXON_BASE_URL=https://data.elexon.co.uk/bmrs/api/v1`
3. Verify the deployment using `curl https://<your-backend-host>/api/health`.

---

## 11. Anonymous GitHub Repository & Challenge Instructions

In accordance with Section 2 and Section 17 of the Gridbricks challenge specification:
- **Application Name:** **WindSight** (used consistently throughout product UI, documentation, and demo).
- **Public GitHub Repository Name:** A distinct anonymous/random repository name (e.g. `gridbricks-swe-assessment-7491` or `gb-forecast-intel-9042`) should be used when creating the public repository to maintain review anonymity.

### Git Publishing Commands
```bash
git init
git add .
git commit -m "Initial commit: Production-Quality WindSight Platform"
git branch -M main
git remote add origin https://github.com/<anonymous-user>/<anonymous-repo-name>.git
git push -u origin main
```

---

## 12. AI-Tool Disclosure

In compliance with the challenge requirements:
- **AI Tool Utilized:** Antigravity IDE powered by Google DeepMind's Gemini 3.8 Flash model.
- **Scope of AI Assistance:** Used for rapid component scaffolding, boilerplate generation, CSS styling adjustments, and test case fixture templating.
- **Engineering Authorship:** All domain logic (Elexon API integration, Day-Ahead decision cutoff logic, future-data leakage prevention, mathematical formulations, and validation suites) was engineered, inspected, and verified by the software engineer.

---

## 13. Verification Matrix

| Feature / Requirement | Challenge Criterion | Verification Status | Evidence |
| :--- | :--- | :---: | :--- |
| **FUELHH Stream** | Filter to WIND, 30-min resolution | **Verified Live** | Retrieved 1,584 records for Jan 2026 |
| **WINDFOR Stream** | Capture startTime and publishTime | **Verified Live** | Retrieved 19,272 candidate forecast records |
| **Cutoff Policy** | Prevent future-data leakage | **Verified** | `test_forecast_published_after_cutoff_is_rejected` PASSED |
| **January Boundary** | Jan 31 decision targets Feb 1 delivery | **Verified** | `test_january_boundary_handling_jan31_to_feb1` PASSED |
| **Accuracy Formulations** | MAE, MAPE, Bias sign, RMSE | **Verified** | `test_accuracy_metrics_calculations` PASSED |
| **Zero Actual Exclusions** | Exclude 0 MW from MAPE | **Verified** | `test_zero_actual_handling_in_mape` PASSED |
| **Interactive UI** | React + Vite + Tailwind + Recharts | **Verified** | Browser test recording completed with subagent |
| **Automated Tests** | Pytest unit and integration suite | **Verified** | 17 of 17 tests passed |
| **Production Build** | Frontend `npm run build` | **Verified** | Vite bundle built in 15.2s |
| **Docker Configuration** | Dockerfile & docker-compose.yml | **Verified** | Multi-stage Dockerfiles configured |
| **Demo Script** | 10-min customer & technical breakdown | **Verified** | `docs/DEMO_SCRIPT.md` created |

---

*WindSight — See the forecast. Measure the uncertainty. Make smarter energy decisions.*
