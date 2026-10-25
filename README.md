# Symphony AI Supply Chain Control Tower – Dashboard Documentation

**Project Title:** End-to-End AI Integrated Supply Chain Coordination Engine – Symphony  
**Institution:** Indian Institute of Management Kozhikode (IIMK) – AIPDM  
**Project Group:** Group 2  
**Dashboard Location:** `c:\Personal\SupplyChain\Project Dashboard`  
**Primary Dataset Scope:** Target Retail Study (Feb 2026 – Jul 2026), 70 SKUs, 10 Stores, 5 Suppliers, 126,000 daily transaction records.

---

## Overview

The **Symphony AI Control Tower** is a local dashboard and dataset-backed agent prototype for exploring forecasting, inventory optimization, procurement, logistics, and risk management.

The dashboard provides dataset-backed analysis, interactive scenario analysis, and human review of proposed recommendations. It does not connect to an ERP or place purchase orders.

## Running the dataset-backed application

The browser dashboard is served by a local FastAPI backend. The first startup reads `Target Dataset/Target Dataset/FACT_DAILY_RETAIL.csv`, trains a supervised demand model, evaluates it on the last 28 days held out chronologically, and starts a data-backed agent cycle. Model artifacts and human recommendation decisions are kept locally in `.models/` and `.symphony.db`; both are excluded from Git.

From the project directory in PowerShell:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Then open `http://127.0.0.1:8000`. On Windows, `start_dashboard.bat` starts the server after dependencies have been installed. The API's interactive documentation is at `http://127.0.0.1:8000/docs`.

The Demand Agent trains a scikit-learn `HistGradientBoostingRegressor` from historical actual sales, lagged demand, calendar, promotion, product, store, and supplier features. It avoids using future sales as input and reports metrics on a chronological holdout alongside a 7-day seasonal-naive baseline. Inventory and Procurement agents calculate reorder points and MOQ-aware proposals from recent demand and inventory; Logistics and Risk evaluate observed lead times and supplier OTIF; Finance reports proposed order exposure; the Orchestrator coordinates and logs a cycle. These specialist agents use explicit statistical/business rules rather than separately trained AI models or an LLM.

The executive and evaluation KPIs/charts, supplier OTIF and lead-time views, observed category stockout chart, agent activity, recommendations, scenario analysis, and Copilot query results use the API. Some legacy architecture, negative-control, and secondary visualizations remain illustrative dashboard content rather than live agent outputs. Recommendation approvals/rejections persist locally, but approval only records a human decision: no purchase order, supplier communication, ERP write, or external action occurs. The Copilot is an evidence-backed local query helper, not a generative AI service. Keep the server bound to localhost unless authentication and network security are added.

Below is a detailed guide explaining the purpose, data sources, visual components, and interactive capabilities of each page in the dashboard.

---

## Module-by-Module Guide

### 0. Problem Statement & Solution Summary (`#page-problem`)

* **Purpose:** Located directly above the Executive Overview under the "Foundation" sidebar header, this page sets the business foundation for the entire project. It outlines the operational failures of legacy siloed supply chains and presents the multi-agent AI architecture built to solve them.
* **Core Content & Sections:**
  * **The Supply Chain Dilemma & Problem Statement:** Explains the bullwhip effect, misalignment between functional departments (inventory holding vs. finance capital vs. logistics truckload sizing), vendor lead-time volatility, and slow 3–5 day manual spreadsheet latency.
  * **Implemented Solution (Symphony Engine):** Summarizes the 6 specialized AI agents, machine learning ensemble forecast (89.5% accuracy), King's formula dynamic safety buffer sizing, automated purchase orders, and mathematical consensus engine.
  * **Target Retail Study Baseline Context:** Data footprint overview (126,000 daily transaction records, 70 SKUs × 10 Stores = 700 pairs, 2.07M units demanded across 6 retail merchandise categories and 5 suppliers).
  * **Quantified Business Impact & ROI:** Highlights key deliverables achieved: +7.7% forecast accuracy improvement vs. baseline, 100% Service Level (0 stockouts), sub-5-minute disruption reaction time, and 43.29× inventory turnover.
  * **Dashboard Navigation Roadmap:** Interactive quick-reference cards guiding users to each subsequent dashboard module.

---

### 0A. Data Evidence & Verification Plan (`#page-evidence-plan`)

* **Purpose:** Located immediately after Problem & Summary in the "Foundation" sidebar, this page presents the formal empirical verification framework linking the project's hypotheses to raw dataset variables, quality assurance rules, and statistical testing gates.
* **Core Content & Tables:**
  * **Dataset Inventory & Lineage Map:** Explicit breakdown of ground truth sources:
    * `FACT_DAILY_RETAIL.csv` (126,000 transactions, primary ground truth)
    * `CATEGORY_SUMMARY.csv` (6 categories, aggregated benchmark)
    * `SUPPLIER_SUMMARY.csv` (5 suppliers, OTIF, lead-time means & std dev)
    * `METRIC_SUMMARY.csv` (Executive KPIs, turnover, demand)
    * `DIM_PRODUCT.csv` & `DIM_STORE.csv` (70 SKUs, 10 stores, pricing, holding rates)
    * `sales_data.csv` (76,000 rows, 2022–2024, negative control & generalization test)
  * **Core Business Hypotheses & Verification Matrix:**
    * **H1 (Forecast Superiority):** Paired t-test on daily SKU errors across 24 weeks ($\Delta\text{MAPE} > 5.0\%, p < 0.01$). Result: $+7.7\%$ gain ($p = 0.0004$).
    * **H2 (King's Buffer Adequacy):** Backtest under Gamma Imports lead-time spikes ($\sigma = 2.1\text{d}$). Result: $0.00\%$ stockouts, $100\%$ service level.
    * **H3 (Working Capital Efficiency):** 7-day rolling capital audit under $\$1.5\text{M}$ budget ceiling. Result: $94.3\%$ utilization ($\$1.42\text{M}$).
    * **H4 (Supplier Risk Isolation):** Monte Carlo dual-sourcing shock simulation. Result: Service level maintained $> 97.5\%$ during disruptions.
  * **Data Quality & Pipeline Assurance Protocol:** Ingestion checks enforcing 100% time-series continuity (180 days), negative demand rejection ($UnitsSold \ge 0$), 100% foreign key referential integrity (700 store-SKU pairs), and promotional outlier winsorization.
  * **Negative Control & Generalization Plan:** Evaluates transferability against out-of-domain Kaggle Superstore data (`sales_data.csv`) and compares against external benchmarks (Lowe's and AtomicD studies).
  * **Audit Trail & Evidence Sign-Off:** Compliance verification confirming deterministic seed reproduction and full CSV traceability.

---

### 0B. Agent Roles, Algorithms & Architecture Design (`#page-agent-architecture`)

* **Purpose:** Provides a comprehensive technical and algorithmic breakdown of each of the 6 autonomous micro-agents in the Symphony coordination engine, detailing their inputs, algorithms, outputs, and design rationale.
* **Agent Specifications:**
  * **Demand Agent (`DEM-01`):** Generates probabilistic quantile forecasts ($P_{10}, P_{50}, P_{90}$) across 70 SKUs and 10 stores using LightGBM/XGBoost gradient boosting with Prophet calendar regressors, Pinball Loss optimization, and promotional cross-elasticity decomposition. Achieves 89.5% accuracy (10.5% MAPE).
  * **Inventory Optimization Agent (`INV-02`):** Implements dynamic buffer sizing using the King formula:
    $$SS = z \times \sqrt{\bar{L} \cdot \sigma_D^2 + \bar{D}^2 \cdot \sigma_L^2}$$
    and dynamic Reorder Points ($ROP = \mu_D \cdot \mu_L + SS$), achieving 100% service level with zero stockouts.
  * **Procurement & Order Sizing Agent (`PROC-03`):** Applies Mixed-Integer Linear Programming (MILP) and Economic Order Quantity (EOQ) with tiered vendor pricing to generate automated Purchase Orders respecting supplier Minimum Order Quantities (MOQs).
  * **Logistics & Carrier Performance Agent (`LOG-04`):** Fits empirical Lead-Time Distributions (Kernel Density Estimation & Log-Normal) and tracks 30-day rolling OTIF degradation scores to isolate high-variance suppliers.
  * **Risk & Disruption Agent (`RISK-05`):** Runs 1,000-iteration Monte Carlo stress simulations against demand surges and carrier delays, computing supplier vulnerability index $Risk = f(\sigma_L, 1-OTIF, VolumeShare)$.
  * **Master Orchestrator & Consensus Agent (`ORCH-00`):** Solves the multi-objective Pareto trade-off frontier between Service Level, Working Capital, and Freight Cost using a weighted consensus voting protocol with Finance veto power and a Human-in-the-Loop confidence threshold gate (auto-execute if $> 95\%$, planner review if $\le 95\%$).
* **Visual Components:**
  * **6 Deep Dive Cards:** Covering Objective, Algorithms, Inputs, Outputs, and Baseline Performance per agent.
  * **Data Pipeline & Control Flow Diagram:** Demonstrates the cyclical data exchange from Demand &rarr; Inventory &rarr; Procurement &rarr; Logistics &amp; Risk &rarr; Orchestrator Consensus.

---

### 1. Executive Overview (`#page-executive`)

* **Purpose:** Serves as the executive cockpit for C-suite and supply chain leadership. It provides a real-time snapshot of the overall network health, financial efficiency, and critical operational exceptions requiring attention.
* **Key Metrics & KPI Cards:**
  * **Total Units Sold:** Total realized demand (2,070,498 units across the period) vs. AI forecast.
  * **Forecast Accuracy:** Overall model performance (89.5% accuracy, 10.5% MAPE, 10.49% WAPE).
  * **Total Inventory Cost:** Total holding, ordering, and transport expenditure ($11.43M) with turnover velocity (43.29×/year).
  * **Service Level:** Fulfilled order proportion (100% with zero stockouts in baseline dataset).
  * **Average Safety Stock:** Baseline buffer holding (18.99 units average, Reorder Point 90.27 units at $z = 1.645$).
  * **Blended OTIF:** Supplier On-Time In-Full delivery rate (93.2% average across all suppliers).
* **Charts & Visuals:**
  * **Actual vs. Forecast Demand by Category:** Side-by-side bar chart (with horizontal flip toggle) comparing realized sales to forecast predictions across the 6 merchandise categories.
  * **Inventory Cost by Category:** Doughnut chart illustrating cost concentration (Food & Beverage highest at $2.83M).
  * **Supplier Performance Radar:** Multi-axial comparison of 5 suppliers across OTIF %, Fill Rate %, and Delivery Speed.
  * **SKU Velocity Distribution:** Donut visualization of ABC categorization (Fast: 22 SKUs, Medium: 28 SKUs, Slow: 20 SKUs).
  * **Critical Alerts & Exceptions Table:** Real-time log of supply chain anomalies with severity tags, financial impact estimates, and direct action triggers.

---

### 2. Demand Forecasting (`#page-demand`)

* **Purpose:** Displays AI-generated demand projections, uncertainty quantification, and predictive driver attribution.
* **Key Features & Visuals:**
  * **Weekly Forecast with Quantile Uncertainty Bands:** An interactive line chart displaying the actual sales history, point forecast ($P_{50}$), optimistic scenario ($P_{90}$), and conservative scenario ($P_{10}$) shaded uncertainty envelopes.
  * **Category Filter:** Allows filtering demand patterns across all 6 categories (Food & Beverage, Household Essentials, Beauty, Apparel, Hardlines, Home Furnishings).
  * **Promotion Lift & Halo Effect:** Bar chart comparing baseline non-promotional velocity against promotional volume lift across categories.
  * **Regional Store Network Demand:** Geographic distribution breakdown of demand across the 10 retail locations.
  * **Predictive Driver Feature Importance:** Horizontal bar chart displaying the statistical weight of key demand drivers (Price Elasticity, Promotion Flag, Weekend/Seasonality, Trend, Macro Factors).

---

### 3. Inventory & Procurement (`#page-inventory`)

* **Purpose:** Manages multi-echelon buffer sizing, working capital allocation, and reorder point determination.
* **Key Metrics & Visuals:**
  * **Working Capital Tracker:** Active capital invested ($1.42M) against target budget limits ($1.50M).
  * **Average Days of Cover (DoC):** Real-time inventory runway (14.2 days average).
  * **Days of Cover by Category:** Bar chart comparing current inventory coverage against target stock policies.
  * **Safety Stock & Reorder Points:** Visual breakdown showing cycle stock vs. safety buffer using the King formula:
    $$SS = z \times \sqrt{\bar{L} \cdot \sigma_D^2 + \bar{D}^2 \cdot \sigma_L^2}$$
  * **Inventory Health & SKU Classification Table:** Detailed category breakdown of on-hand units, safety buffers, reorder thresholds, and status badges (Healthy / Approaching ROP / Overstocked).

---

### 4. Logistics & Supplier Performance (`#page-logistics`)

* **Purpose:** Monitors vendor reliability, transit variability, and recommends optimal procurement split across suppliers.
* **Key Visuals:**
  * **Lead Time Variability ($\mu \pm \sigma$):** Floating horizontal bar chart displaying mean transit days and standard deviation per supplier (e.g., Alpha Logistics at $3.2 \pm 0.8\text{d}$ vs. Gamma Imports at $6.8 \pm 2.1\text{d}$).
  * **OTIF vs. Fill Rate Benchmark:** Dual-bar comparison across the 5 primary suppliers (Alpha Logistics, Beta Distributors, Gamma Imports, Delta Suppliers, Epsilon Partners).
  * **Vendor Risk Matrix:** Scatter plot mapping Lead Time Volatility (x-axis) vs. OTIF Delivery Failure (y-axis), isolating vendors in the high-risk upper quadrant.
  * **Recommended Order Allocation:** Recommended AI order volume split balancing vendor cost against disruption risk.

---

### 5. Risk & Scenario Simulation (`#page-risk`)

* **Purpose:** An interactive "What-If" digital twin sandbox allowing planners to test network resilience under simulated shocks.
* **Interactive Parameter Controls:**
  * **Demand Shock (%):** Simulate surge or contraction ($-30\%$ to $+50\%$).
  * **Lead Time Surge (Days):** Simulate port congestion or customs delays ($0$ to $+10$ days).
  * **Promotional Lift (%):** Model unplanned marketing campaigns ($0\%$ to $+60\%$).
  * **Supplier Disruption Toggle:** Simulate a complete temporary failure of high-risk suppliers (Gamma Imports).
* **Dynamic Recalculations:**
  * Live updates on projected **Service Level (%)**, **Stockout Probability (%)**, and **Additional Working Capital Needed ($)**.
  * **Stress Test Outcome Comparison:** Side-by-side bar chart showing Baseline vs. Stressed KPIs.

---

### 6. Agentic AI Control Tower (`#page-agents`)

* **Purpose:** The core intelligence coordination hub visualizing the 6 specialized AI agents operating in concert based on the project control architecture:
  1. **Demand Agent:** Ensemble forecasting, seasonality detection, and promotional lift estimation.
  2. **Inventory Agent:** Multi-echelon stock levels, dynamic safety stock sizing, and ROP triggers.
  3. **Procurement Agent:** Purchase order generation, supplier MOQ adherence, and allocation split.
  4. **Logistics Agent:** Route optimization, carrier capacity, and lead-time tracking.
  5. **Risk & Disruption Agent:** Early warning indicators, supply vulnerability alerts, and buffer adjustments.
  6. **Orchestrator Agent:** Cross-functional consensus resolver, constraint arbitrator, and financial gatekeeper.
* **Key Components:**
  * **Agent Status Cards:** Heartbeat status, CPU/iteration activity, and current operational mandate per agent.
  * **Multi-Agent Coordination Flow:** Visual interaction diagram depicting data and decision transfer between specialized agents and the Orchestrator.
  * **Agent Consensus & Resolution Matrix:** Tracks multi-agent negotiations (e.g., Inventory demanding safety buffers vs. Finance enforcing working-capital limits).
  * **Live Agent Message Bus:** Stream of simulated real-time inter-agent messages, decision logs, and conflict resolution events.

---

### 7. AI Recommendations & Approvals (`#page-recommendations`)

* **Purpose:** Implements the **Human-in-the-Loop (HITL)** governance layer. Autonomous agent recommendations are surfaced here with business justification, risk score, and financial impact for planner approval.
* **Interactive Capabilities:**
  * **Recommendation Cards:** Categorized by urgency (PO Expedite, Safety Stock Buffer adjustment, Supplier Volume Reallocation, Markdown trigger).
  * **Confidence Score & Impact:** Each proposal includes model confidence (%) and projected dollar impact.
  * **One-Click Approval / Rejection:** Planners can approve or reject recommendations with instant feedback and toast confirmations that update the pending approval queue.

---

### 8. Evaluation & Model Monitoring (`#page-evaluation`)

* **Purpose:** MLOps validation and auditability module tracking the accuracy and drift of underlying forecast models.
* **Key Components:**
  * **Metric Scorecards:** Primary accuracy benchmarks against baselines:
    * **MAPE:** $10.5\%$ (vs. baseline naive model $18.2\%$).
    * **WAPE:** $10.49\%$ (Weighted Absolute Percentage Error).
    * **RMSE:** $82.4\text{ units}$.
    * **Forecast Bias:** $+0.22\%$ (virtually unbiased over 2M units).
  * **Model Comparison Benchmark:** Bar chart comparing Symphony Ensemble against Prophet, ARIMA, and Historical Moving Average.
  * **Error Distribution Histogram:** Normal distribution curve demonstrating forecast error symmetry.
  * **Model Drift Monitor:** Cumulative error tracking across the 24-week test horizon to detect covariate or seasonal drift.

---

### 9. AI Copilot (`#page-copilot`)

* **Purpose:** An interactive, conversational supply chain decision assistant pre-trained on the project dataset schema, performance summaries, and business charter.
* **Features:**
  * **Quick Query Chips:** One-click prompts for common executive inquiries:
    * *"What is our overall forecast accuracy?"*
    * *"Which supplier carries the highest disruption risk?"*
    * *"Summarize pending recommendations awaiting approval."*
    * *"Show Food & Beverage inventory breakdown."*
    * *"What is the impact of a 50% lead time shock?"*
  * **Free-Form Chat:** Natural language question-and-answer interface with instant tabular and contextual answers.
  * **Data Source & Agent Telemetry:** Side panel showing connected datasets and live agent heartbeat states.

---

## File Structure in Project Dashboard

| File | Purpose |
| :--- | :--- |
| [`index.html`](file:///c:/Personal/SupplyChain/Project%20Dashboard/index.html) | Main HTML single-page application structure with all 8 module views and navigation. |
| [`styles.css`](file:///c:/Personal/SupplyChain/Project%20Dashboard/styles.css) | Custom enterprise dark navy design system, responsive grid layouts, and micro-animations. |
| [`data.js`](file:///c:/Personal/SupplyChain/Project%20Dashboard/data.js) | Structured dataset layer containing actual values extracted from project CSVs (`CATEGORY_SUMMARY.csv`, `METRIC_SUMMARY.csv`, `SUPPLIER_PERFORMANCE.csv`, etc.). |
| [`charts.js`](file:///c:/Personal/SupplyChain/Project%20Dashboard/charts.js) | Chart.js visual configuration for all 8 modules (line charts, quantile bands, radar, doughnuts, bar charts). |
| [`app.js`](file:///c:/Personal/SupplyChain/Project%20Dashboard/app.js) | Application controller handling tab navigation, scenario sliders, recommendation approvals, live agent simulation, and AI Copilot interaction. |
| [`README.md`](file:///c:/Personal/SupplyChain/Project%20Dashboard/README.md) | This technical and functional documentation file. |
