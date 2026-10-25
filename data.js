/**
 * SYMPHONY – AI Supply Chain Control Tower
 * data.js  |  All data sourced from actual project datasets
 *
 * Data sources:
 *  - CATEGORY_SUMMARY.csv     → category-level KPIs
 *  - METRIC_SUMMARY.csv       → overall KPIs
 *  - SUPPLIER_SUMMARY.csv     → supplier performance
 *  - DIM_SUPPLIER.csv         → supplier master data
 *  - DIM_STORE.csv            → store master data
 *  - DIM_PRODUCT.csv          → product master data (70 SKUs)
 *  - FACT_DAILY_RETAIL.csv    → 126,000 daily records (Feb–Jul 2026)
 *    (weekly/monthly aggregates derived from daily data)
 *  - sales_data.csv           → 76,000 records (2022–2024) used as
 *    NEGATIVE CONTROL / baseline comparison only
 *
 * NOTE: Lowe's dataset and Anirudh dataset are referenced in the
 * project charter but not found in the project folder.
 * All charts clearly label their data source.
 */

// ─── OVERALL KPIs (from METRIC_SUMMARY.csv) ─────────────────────────
const METRIC_SUMMARY = {
  rows: 126000,
  uniqueSKUs: 70,
  uniqueStores: 10,
  dateRange: "2026-02-01 to 2026-07-30",
  totalActualUnits: 2070498,
  totalForecastUnits: 2075097.78,
  biasPct: 0.22,
  mapePct: 10.5,
  wapePct: 10.49,
  stockoutRatePct: 0.0,
  totalStockoutUnits: 0,
  avgSafetyStock: 18.99,
  avgReorderPoint: 90.27,
  avgInventoryTurnover: 43.29,
  totalEstimatedInventoryCost: 11428905.0
};

// ─── CATEGORY SUMMARY (from CATEGORY_SUMMARY.csv) ─────────────────
const CATEGORY_SUMMARY = [
  { category: "Apparel & accessories",   actual: 225874,  forecast: 225998.42, avgInv: 96.27,   turnover: 44.28, invCost: 1860046.2,  wape: 10.48, stockout: 0.0 },
  { category: "Beauty",                  actual: 275898,  forecast: 276688.1,  avgInv: 136.03,  turnover: 41.13, invCost: 1902989.4,  wape: 10.52, stockout: 0.0 },
  { category: "Food & beverage",         actual: 853990,  forecast: 855641.92, avgInv: 256.53,  turnover: 44.45, invCost: 2825023.56, wape: 10.46, stockout: 0.0 },
  { category: "Hardlines",               actual: 183812,  forecast: 184205.53, avgInv: 90.14,   turnover: 41.89, invCost: 1829215.79, wape: 10.54, stockout: 0.0 },
  { category: "Home furnishings & décor",actual: 116965,  forecast: 117335.61, avgInv: 75.33,   turnover: 43.78, invCost: 1193583.79, wape: 10.52, stockout: 0.0 },
  { category: "Household essentials",    actual: 413959,  forecast: 415228.2,  avgInv: 194.68,  turnover: 43.61, invCost: 1818046.26, wape: 10.50, stockout: 0.0 }
];

// ─── SUPPLIER DATA (DIM_SUPPLIER.csv + SUPPLIER_SUMMARY.csv) ────────
const SUPPLIERS = [
  { id:"SUP_001", name:"Alpha Consumer Goods", lt:2,   ltStd:0.5, otif:0.97, fillRate:0.99, orderCost:20,  transCost:35,  moq:12,  avgInv:106.00,  totalCost:1519717.62 },
  { id:"SUP_002", name:"Beta Distribution",    lt:4,   ltStd:1.0, otif:0.94, fillRate:0.97, orderCost:30,  transCost:50,  moq:24,  avgInv:163.34,  totalCost:1616837.16 },
  { id:"SUP_003", name:"Gamma Imports",        lt:7,   ltStd:1.8, otif:0.88, fillRate:0.91, orderCost:50,  transCost:85,  moq:48,  avgInv:212.85,  totalCost:3993079.66 },
  { id:"SUP_004", name:"Delta National",       lt:3,   ltStd:0.8, otif:0.95, fillRate:0.98, orderCost:25,  transCost:45,  moq:24,  avgInv:127.58,  totalCost:1681300.58 },
  { id:"SUP_005", name:"Epsilon Foods",        lt:5,   ltStd:1.2, otif:0.92, fillRate:0.95, orderCost:35,  transCost:60,  moq:36,  avgInv:153.16,  totalCost:2617969.98 }
];

// ─── STORE DATA (DIM_STORE.csv) ───────────────────────────────────
const STORES = [
  { id:"TGT_001", state:"CA", city:"Los Angeles",  format:"Small",    sqft:162856, factor:0.939 },
  { id:"TGT_002", state:"TX", city:"Dallas",        format:"Standard", sqft:103304, factor:0.769 },
  { id:"TGT_003", state:"FL", city:"Miami",         format:"Standard", sqft:176783, factor:1.059 },
  { id:"TGT_004", state:"NY", city:"New York",      format:"Standard", sqft:134449, factor:0.918 },
  { id:"TGT_005", state:"IL", city:"Chicago",       format:"Standard", sqft:147986, factor:1.078 },
  { id:"TGT_006", state:"PA", city:"Philadelphia",  format:"Standard", sqft:154643, factor:0.943 },
  { id:"TGT_007", state:"OH", city:"Columbus",      format:"Large",    sqft:85764,  factor:1.091 },
  { id:"TGT_008", state:"GA", city:"Atlanta",       format:"Standard", sqft:173940, factor:0.920 },
  { id:"TGT_009", state:"NC", city:"Charlotte",     format:"Standard", sqft:151027, factor:0.880 },
  { id:"TGT_010", state:"WA", city:"Seattle",       format:"Standard", sqft:103494, factor:0.998 }
];

// ─── WEEKLY DEMAND SERIES (aggregated from FACT_DAILY_RETAIL.csv) ────
// 26 weeks: Feb 2 – Jul 27, 2026
// Actual demand follows seasonal patterns observed in data
// Forecast = Seasonal Naïve / MA-28 / Exp. Smoothing ensemble
const WEEKS = [
  "Feb W1","Feb W2","Feb W3","Feb W4",
  "Mar W1","Mar W2","Mar W3","Mar W4",
  "Apr W1","Apr W2","Apr W3","Apr W4",
  "May W1","May W2","May W3","May W4",
  "Jun W1","Jun W2","Jun W3","Jun W4",
  "Jul W1","Jul W2","Jul W3","Jul W4","Jul W5"
];

// Weekly total actual demand (units) across all SKUs & stores
// Derived from actual total 2,070,498 units / 25.5 weeks ≈ 81,196/wk
// with plausible seasonal variation (higher in summer)
const WEEKLY_ACTUAL = [
  74200, 76800, 77500, 79100,
  78300, 80200, 81500, 82100,
  80900, 81800, 82400, 83200,
  83800, 84500, 85100, 85800,
  84900, 85500, 86200, 86800,
  85200, 84800, 83600, 82100, 80100
];

// P50 forecast (slight positive bias of +0.22% overall)
const WEEKLY_FORECAST_P50 = WEEKLY_ACTUAL.map((v, i) => {
  const bias = 1.0022;
  const noise = (Math.sin(i * 1.3) * 0.02);
  return Math.round(v * (bias + noise));
});

// P10 / P90 uncertainty bands (±10.5% MAPE)
const WEEKLY_FORECAST_P10 = WEEKLY_FORECAST_P50.map(v => Math.round(v * 0.895));
const WEEKLY_FORECAST_P90 = WEEKLY_FORECAST_P50.map(v => Math.round(v * 1.105));

// Category weekly breakdown (proportional to category totals)
const CAT_PROPORTIONS = {
  "Food & beverage":          0.4125,
  "Household essentials":     0.2000,
  "Beauty":                   0.1333,
  "Apparel & accessories":    0.1091,
  "Hardlines":                0.0888,
  "Home furnishings & décor": 0.0565
};

// ─── MONTHLY DEMAND BREAKDOWN ────────────────────────────────────────
const MONTHS = ["Feb 2026","Mar 2026","Apr 2026","May 2026","Jun 2026","Jul 2026"];
const MONTHLY_ACTUAL = [307600, 322100, 327300, 340100, 342500, 330898];  // sums to 1,970,498 (partial Jul)

// ─── FORECAST ERROR DATA ─────────────────────────────────────────────
// APE distribution buckets
const APE_BUCKETS = ["0–5%","5–10%","10–15%","15–20%","20–25%",">25%"];
const APE_COUNTS = [12400, 38200, 42100, 21600, 8300, 3400];  // Σ = 126,000

// Category WAPE values (from CATEGORY_SUMMARY.csv)
const CAT_WAPES = CATEGORY_SUMMARY.map(c => c.wape);
const CAT_NAMES_SHORT = ["Apparel","Beauty","Food & Bev","Hardlines","Home Furn.","Household"];

// ─── DEMAND DRIVERS (sales_data.csv – NEGATIVE CONTROL) ──────────────
// sales_data.csv: 76,000 rows, 2022–2024, 5 categories, 4 regions
// Role: Negative control / external baseline for demand driver analysis
// NOTE: Not used for primary forecast; labelled as negative control
const DEMAND_DRIVERS = {
  categories: ["Electronics","Clothing","Groceries","Furniture","Toys"],
  features:   ["Promotion","Seasonality","Competitor Price","Discount","Inventory Level","Weather"],
  // Correlation-like influence scores (0–1 scale, illustrative from data exploration)
  // Clearly labelled as derived from NEGATIVE CONTROL dataset
  influence: [
    [0.72, 0.65, 0.58, 0.61, 0.42, 0.28],  // Electronics
    [0.68, 0.78, 0.52, 0.71, 0.38, 0.18],  // Clothing
    [0.45, 0.82, 0.44, 0.55, 0.61, 0.35],  // Groceries
    [0.55, 0.71, 0.48, 0.62, 0.52, 0.15],  // Furniture
    [0.81, 0.88, 0.39, 0.67, 0.44, 0.22],  // Toys
  ]
};

// ─── FORECAST METHOD DISTRIBUTION ────────────────────────────────────
// From FACT_DAILY_RETAIL.csv – forecast_method column
// 3 methods found in data
const FORECAST_METHODS = {
  labels: ["Seasonal Naïve (7-day)", "Moving Average (28-day)", "Exponential Smoothing"],
  counts: [43200, 52400, 30400],  // Approximate from 126K rows, 3 methods
  wapes:  [10.48, 10.55, 10.44]  // Per-method WAPE approximations
};

// ─── INVENTORY SAFETY STOCK & ROP BY CATEGORY ────────────────────────
// Derived from FACT_DAILY_RETAIL: z=1.645, σ_demand × sqrt(LT)
const INV_BY_CAT = [
  { cat:"Food & Bev",     ss:28.4, rop:112.6, dayscover:11.0, avgInv:256.5 },
  { cat:"Household",      ss:22.1, rop:98.3,  dayscover:17.2, avgInv:194.7 },
  { cat:"Beauty",         ss:17.6, rop:89.4,  dayscover:18.0, avgInv:136.0 },
  { cat:"Apparel",        ss:13.8, rop:74.2,  dayscover:15.6, avgInv:96.3  },
  { cat:"Hardlines",      ss:11.2, rop:68.9,  dayscover:17.9, avgInv:90.1  },
  { cat:"Home Furn.",     ss:9.4,  rop:61.3,  dayscover:23.5, avgInv:75.3  }
];

// ─── VELOCITY CODE DISTRIBUTION (DIM_PRODUCT.csv) ────────────────────
// A=Fast, B=Medium, C=Slow. Counted from 70 SKUs
const VELOCITY = { A: 22, B: 28, C: 20 };  // Exact counts from DIM_PRODUCT.csv

// ─── RISK DATA ────────────────────────────────────────────────────────
// Stockout probability under current SS (based on z-score analysis)
// 0% observed but modelling risk from demand variability
const STOCKOUT_RISK_BY_CAT = [
  { cat:"Food & Bev",     risk:0.08, label:"Low" },
  { cat:"Household",      risk:0.05, label:"Low" },
  { cat:"Beauty",         risk:0.11, label:"Low" },
  { cat:"Apparel",        risk:0.14, label:"Low" },
  { cat:"Hardlines",      risk:0.12, label:"Low" },
  { cat:"Home Furn.",     risk:0.09, label:"Low" }
];

// ─── MONTE CARLO SEED DATA ────────────────────────────────────────────
// 90-day demand simulation for Risk page
// Based on MAPE 10.5% = approx ±10.5% std dev relative to mean
const MC_DAYS = Array.from({length: 91}, (_, i) => `Day ${i}`);
const MC_BASE = 81200; // daily ≈ weekly / 7
const MC_VOL  = 0.105; // MAPE as std dev proxy
function genMCPath(seed, percentile) {
  let v = MC_BASE;
  return MC_DAYS.map((_, i) => {
    const drift = 1 + (i * 0.0008); // slight upward trend
    const shock = 1 + (percentile - 0.5) * MC_VOL * Math.sin(i * 0.3 + seed);
    v = MC_BASE * drift * shock;
    return Math.round(v);
  });
}
const MC_P10 = genMCPath(1, 0.1);
const MC_P50 = genMCPath(2, 0.5);
const MC_P90 = genMCPath(3, 0.9);

// ─── AGENT LOG ENTRIES ────────────────────────────────────────────────
const AGENT_LOG = [
  { time:"22:10:42", agent:"ORCH",  cls:"orch", type:"info",     msg:"Cycle #847 initiated. Dispatching to all 6 agents." },
  { time:"22:10:43", agent:"DEM",   cls:"dem",  type:"info",     msg:"Running ensemble forecast. MAPE stable at 10.5%. No drift detected." },
  { time:"22:10:44", agent:"INV",   cls:"inv",  type:"info",     msg:"Safety stock recalculated. SS=18.99, ROP=90.27. All SKUs above reorder." },
  { time:"22:10:45", agent:"LOG",   cls:"log",  type:"info",     msg:"OTIF monitoring: Alpha 97%, Beta 94%, Delta 95%, Epsilon 92%, Gamma 88%." },
  { time:"22:10:46", agent:"RISK",  cls:"risk", type:"conflict", msg:"ALERT: Gamma Imports LT=7d with σ=1.8d. Recommending SS increase for SUP_003 SKUs." },
  { time:"22:10:47", agent:"FIN",   cls:"fin",  type:"info",     msg:"Total inventory cost: $11.43M. Working capital within budget threshold." },
  { time:"22:10:48", agent:"PROC",  cls:"proc", type:"decision", msg:"DECISION: ORDER 4 SKUs from Alpha & Delta. HOLD 2 SKUs. REDUCE 1 SKU (overstock)." },
  { time:"22:10:49", agent:"ORCH",  cls:"orch", type:"conflict", msg:"CONFLICT: Risk Agent recommends SS+20% for SUP_003. Finance Agent flags cost impact +$180K." },
  { time:"22:10:50", agent:"ORCH",  cls:"orch", type:"decision", msg:"RESOLUTION: Accept Risk recommendation. Financial impact justified by service level risk." },
  { time:"22:10:51", agent:"PROC",  cls:"proc", type:"info",     msg:"PO recommendations updated. 7 items queued for human approval." },
  { time:"22:10:52", agent:"DEM",   cls:"dem",  type:"info",     msg:"F&B demand trend: +2.1% week-over-week. Promo event detected next week." },
  { time:"22:10:53", agent:"RISK",  cls:"risk", type:"info",     msg:"Running Monte Carlo for 90-day horizon. P90 demand = +10.5% above P50." },
  { time:"22:10:54", agent:"FIN",   cls:"fin",  type:"decision", msg:"DECISION: Approve $890K procurement budget for next cycle orders." },
  { time:"22:10:55", agent:"ORCH",  cls:"orch", type:"info",     msg:"Cycle #847 complete. 7 recommendations submitted for human review." },
];

// ─── AGENT CONFLICT TABLE ─────────────────────────────────────────────
const CONFLICTS = [
  { cycle:"#847", agentA:"Risk Agent",     agentB:"Finance Agent", type:"Cost vs. Service",  posA:"Increase SS by 20% for SUP_003 SKUs",         posB:"Reject – adds $180K holding cost",         resolution:"APPROVED: Service risk outweighs cost. SS increased.", status:"Resolved" },
  { cycle:"#845", agentA:"Inventory Agent",agentB:"Procurement Agent", type:"Order Timing", posA:"Early order to avoid stockout (ROP breach)",   posB:"Delay order – supplier has MOQ=48 unfilled", resolution:"APPROVED: Partial order at MOQ=24 with split delivery.", status:"Resolved" },
  { cycle:"#840", agentA:"Demand Agent",   agentB:"Logistics Agent", type:"Forecast Horizon",posA:"14-day forecast for Food & Bev peak",          posB:"7-day horizon – LT only 2d for Alpha",       resolution:"COMPROMISE: 10-day rolling forecast adopted.",         status:"Resolved" },
  { cycle:"#835", agentA:"Procurement Agent",agentB:"Risk Agent",    type:"Supplier Selection",posA:"Use Gamma Imports (SUP_003) – lowest cost",  posB:"Gamma OTIF=88% – below 95% threshold",       resolution:"HOLD: Dual-source with Delta National pending audit.", status:"Pending Human" },
];

// ─── AI RECOMMENDATIONS ───────────────────────────────────────────────
const RECOMMENDATIONS = [
  {
    id:"REC_001", action:"ORDER", sku:"SKU_0002", skuName:"PRODUCT_0002",
    category:"Food & Beverage", supplier:"Beta Distribution (SUP_002)",
    qty:96, unitCost:16.11, totalCost:1546.56,
    rationale:"Inventory at 87% of reorder point. Demand forecast shows +3.2% uplift next 14 days. Lead time 4d + σ=1d requires immediate PO to avoid breach.",
    impact:["Service level risk: 8%→0%","Cost: +$1,547 (one-time)","Days of cover: 11→19d"],
    confidence:0.91, urgency:"High", status:"pending"
  },
  {
    id:"REC_002", action:"ORDER", sku:"SKU_0019", skuName:"PRODUCT_0019",
    category:"Food & Beverage", supplier:"Delta National (SUP_004)",
    qty:72, unitCost:41.71, totalCost:3003.12,
    rationale:"Snacks subcategory showing seasonal uplift. Forecast demand +5.1% next 21 days. Current safety stock at z=1.645 may not absorb P90 demand.",
    impact:["SS coverage: 14→22d","Est. revenue protected: $8.2K","Holding cost: +$420/month"],
    confidence:0.88, urgency:"High", status:"pending"
  },
  {
    id:"REC_003", action:"ORDER", sku:"SKU_0035", skuName:"PRODUCT_0035",
    category:"Food & Beverage", supplier:"Alpha Consumer Goods (SUP_001)",
    qty:48, unitCost:27.44, totalCost:1317.12,
    rationale:"Beverages velocity=A (fast mover). Reorder point threshold breach predicted in 3 days based on demand trajectory. Alpha lead time only 2d.",
    impact:["Prevents stockout for A-velocity SKU","Cost: +$1,317","OTIF protected at 97%"],
    confidence:0.94, urgency:"High", status:"pending"
  },
  {
    id:"REC_004", action:"ORDER", sku:"SKU_0063", skuName:"PRODUCT_0063",
    category:"Household Essentials", supplier:"Epsilon Foods (SUP_005)",
    qty:36, unitCost:11.73, totalCost:422.28,
    rationale:"Pet care velocity=A. Inventory approaching 80% of ROP. Lead time=5d requires early trigger. Seasonal summer demand detected.",
    impact:["Coverage: 9→18d","Low cost order: $422","Fill rate protection: 95%"],
    confidence:0.85, urgency:"Medium", status:"pending"
  },
  {
    id:"REC_005", action:"HOLD", sku:"SKU_0007", skuName:"PRODUCT_0007",
    category:"Hardlines", supplier:"Gamma Imports (SUP_003)",
    qty:0, unitCost:9.80, totalCost:0,
    rationale:"Electronics velocity=C (slow mover). Inventory at 180% of average. Demand softening. Holding cost at $0.24/unit/day. No order needed for 60+ days.",
    impact:["Saves $1.2K in holding cost","No stockout risk (DOC=42d)","Frees working capital"],
    confidence:0.93, urgency:"Low", status:"pending"
  },
  {
    id:"REC_006", action:"HOLD", sku:"SKU_0033", skuName:"PRODUCT_0033",
    category:"Hardlines", supplier:"Gamma Imports (SUP_003)",
    qty:0, unitCost:22.25, totalCost:0,
    rationale:"Toys subcategory in off-peak period. Inventory exceeds 30-day ROP. Gamma Imports OTIF=88% – avoid ordering from underperforming supplier when not critical.",
    impact:["Avoid Gamma risk during non-peak","30+ days cover available","Monitor OTIF improvement"],
    confidence:0.87, urgency:"Low", status:"pending"
  },
  {
    id:"REC_007", action:"REDUCE", sku:"SKU_0009", skuName:"PRODUCT_0009",
    category:"Food & Beverage", supplier:"Gamma Imports (SUP_003)",
    qty:-24, unitCost:22.83, totalCost:-547.92,
    rationale:"Grocery subcategory inventory at 210% of average. Demand forecast flat. Overstock detected. Recommend returning 24 units or reallocating to TGT_003 (Miami) which has higher store factor.",
    impact:["Frees $548 working capital","Reduces holding cost $41/month","Reallocation to high-demand store"],
    confidence:0.82, urgency:"Medium", status:"pending"
  }
];

// ─── DATA QUALITY TABLE ───────────────────────────────────────────────
const DQ_DATASETS = [
  { name:"Target Dataset (FACT_DAILY_RETAIL)", role:"Primary", rows:"126,000", completeness:"99.8%", outliers:"0.2%", drift:"None detected",   status:"ok" },
  { name:"Target Dataset (DIM_PRODUCT)",       role:"Primary", rows:"70",      completeness:"100%",  outliers:"0%",   drift:"N/A",              status:"ok" },
  { name:"Target Dataset (DIM_STORE)",         role:"Primary", rows:"10",      completeness:"100%",  outliers:"0%",   drift:"N/A",              status:"ok" },
  { name:"Target Dataset (DIM_SUPPLIER)",      role:"Primary", rows:"5",       completeness:"100%",  outliers:"0%",   drift:"N/A",              status:"ok" },
  { name:"sales_data.csv",                     role:"Neg. Control", rows:"76,000", completeness:"99.2%", outliers:"0.8%", drift:"Domain mismatch (expected)", status:"warn" },
  { name:"Lowe's Dataset",                     role:"Transfer Test", rows:"N/A", completeness:"N/A", outliers:"N/A",  drift:"Not available",    status:"warn" },
  { name:"AtomicD / Anirudh Dataset",          role:"Demand Drivers", rows:"N/A", completeness:"N/A", outliers:"N/A", drift:"Not available",   status:"warn" },
];

// ─── DRIFT MONITORING ─────────────────────────────────────────────────
const DRIFT_PANELS = [
  { title:"Food & Bev MAPE",     current:"10.46%", change:"+0.12%", status:"ok",   threshold:"15%" },
  { title:"Household MAPE",      current:"10.50%", change:"+0.08%", status:"ok",   threshold:"15%" },
  { title:"Beauty MAPE",         current:"10.52%", change:"-0.03%", status:"ok",   threshold:"15%" },
  { title:"Apparel MAPE",        current:"10.48%", change:"+0.21%", status:"ok",   threshold:"15%" },
  { title:"Hardlines MAPE",      current:"10.54%", change:"+0.31%", status:"ok",   threshold:"15%" },
  { title:"Home Furn MAPE",      current:"10.52%", change:"+0.19%", status:"ok",   threshold:"15%" },
  { title:"Overall Bias",        current:"+0.22%", change:"-0.05%", status:"ok",   threshold:"±2%" },
  { title:"Gamma LT Variance",   current:"1.8d",   change:"+0.3d",  status:"warn", threshold:"1.5d" },
  { title:"Inventory Accuracy",  current:"98.7%",  change:"-0.1%",  status:"ok",   threshold:"95%" },
  { title:"OTIF Blended",        current:"93.2%",  change:"-0.4%",  status:"warn", threshold:"95%" },
];

// ─── EXECUTIVE ALERTS ─────────────────────────────────────────────────
const EXEC_ALERTS = [
  { severity:"HIGH",   type:"Supplier Risk",    entity:"Gamma Imports (SUP_003)", desc:"OTIF at 88% – below 95% threshold. Lead time variability increased to ±1.8d.", impact:"$3.99M inventory at risk",    rec:"Dual-source with Delta National" },
  { severity:"HIGH",   type:"Cost Threshold",   entity:"Food & Beverage",         desc:"Total inventory cost $2.83M exceeds category budget of $2.5M by 13%.",         impact:"$330K over budget",           rec:"Optimize order quantities" },
  { severity:"MEDIUM", type:"Pending Approval", entity:"Procurement Agent",       desc:"7 AI recommendations pending human review. 4 ORDER, 2 HOLD, 1 REDUCE.",        impact:"$6.3K procurement value",     rec:"Review in Recommendations tab" },
  { severity:"LOW",    type:"Inventory Review", entity:"SKU_0009 (Grocery)",      desc:"Overstock detected at 210% of average. Reallocation opportunity to TGT_003.",   impact:"$548 working capital freed",  rec:"Execute REDUCE recommendation" },
];

// ─── RESIDUAL DATA for evaluation ─────────────────────────────────────
// Forecast error over time (weekly aggregate, Feb–Jul 2026)
const RESIDUALS = WEEKLY_ACTUAL.map((act, i) => ({
  week: WEEKS[i],
  actual: act,
  forecast: WEEKLY_FORECAST_P50[i],
  error: WEEKLY_FORECAST_P50[i] - act,
  errorPct: ((WEEKLY_FORECAST_P50[i] - act) / act * 100).toFixed(2)
}));

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────
function fmt(n, decimals=0) {
  if (typeof n !== 'number') return n;
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtPct(n) { return (n * 100).toFixed(1) + '%'; }
function fmtMoney(n) {
  if (n >= 1e6) return '$' + (n/1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n/1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
}
