from __future__ import annotations

import math
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Literal

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error


ROOT = Path(__file__).resolve().parent.parent
FACT_FILE = ROOT / "Target Dataset" / "Target Dataset" / "FACT_DAILY_RETAIL.csv"
MODEL_DIR = ROOT / ".models"
MODEL_FILE = MODEL_DIR / "demand_model.joblib"
DB_FILE = ROOT / ".symphony.db"
Z_VALUE = 1.645
MODEL_VERSION = 2
FEATURE_COLUMNS = [
    "lag_7", "lag_28", "mean_28", "std_28", "base_demand",
    "weekday_factor", "season_factor", "promo_flag", "promo_event_flag",
    "discount_pct", "store_factor", "lead_time_days", "unit_cost_ratio",
    "sku_id_code", "store_id_code", "category_code", "supplier_id_code", "weekday_code",
]
CSV_COLUMNS = [
    "date", "sku_id", "store_id", "category", "product_name", "unit_cost",
    "unit_cost_ratio", "annual_holding_rate", "supplier_id", "supplier_name",
    "lead_time_days", "lead_time_std_days", "otif_pct", "fill_rate_pct",
    "ordering_cost", "transport_cost", "default_moq", "weekday",
    "promo_event_flag", "base_demand", "weekday_factor", "season_factor",
    "promo_flag", "discount_pct", "store_factor", "actual_sales",
    "safety_stock", "reorder_point", "available_inventory", "stockout_flag",
    "stockout_units", "selling_price", "total_inventory_cost",
]


def _feature_frame(data: pd.DataFrame) -> pd.DataFrame:
    frame = data.copy()
    frame["date"] = pd.to_datetime(frame["date"], errors="raise")
    frame.sort_values(["sku_id", "store_id", "date"], inplace=True)
    grouped = frame.groupby(["sku_id", "store_id"], sort=False)["actual_sales"]
    frame["lag_7"] = grouped.shift(7)
    frame["lag_28"] = grouped.shift(28)
    frame["mean_28"] = grouped.transform(
        lambda values: values.shift(1).rolling(28, min_periods=7).mean()
    )
    frame["std_28"] = grouped.transform(
        lambda values: values.shift(1).rolling(28, min_periods=7).std()
    ).fillna(0)

    for column in ("sku_id", "store_id", "category", "supplier_id", "weekday"):
        frame[f"{column}_code"] = pd.Categorical(frame[column]).codes

    frame["promo_flag"] = frame.get("promo_flag", 0) if "promo_flag" in frame else 0
    frame["promo_event_flag"] = frame["promo_event_flag"].fillna(0)
    frame["date"] = pd.to_datetime(frame["date"])
    frame["weekday_code"] = frame["date"].dt.dayofweek
    return frame


class SupplyChainSystem:
    def __init__(self) -> None:
        if not FACT_FILE.is_file():
            raise FileNotFoundError(f"Required retail dataset not found: {FACT_FILE}")
        self.lock = Lock()
        self.data = pd.read_csv(FACT_FILE, usecols=CSV_COLUMNS)
        if self.data.empty:
            raise ValueError(f"Retail dataset is empty: {FACT_FILE}")
        self.data["actual_sales"] = pd.to_numeric(self.data["actual_sales"], errors="raise").clip(lower=0)
        self.data["date"] = pd.to_datetime(self.data["date"], errors="raise")
        self.data.sort_values(["sku_id", "store_id", "date"], inplace=True)
        self.model, self.model_info, self.validation = self._train_model()
        self.recommendations: list[dict] = []
        self.logs: list[dict] = []
        self.conflicts: list[dict] = []
        self.cycle_number = 0
        self._init_database()
        self.run_cycle()

    def _train_model(self) -> tuple[HistGradientBoostingRegressor, dict, pd.DataFrame]:
        signature = {
            "model_version": MODEL_VERSION,
            "size": FACT_FILE.stat().st_size,
            "modified": FACT_FILE.stat().st_mtime,
            "rows": len(self.data),
        }
        if MODEL_FILE.is_file():
            cached = joblib.load(MODEL_FILE)
            if cached.get("signature") == signature:
                return cached["model"], cached["info"], cached["validation"]

        frame = _feature_frame(self.data)
        frame.dropna(subset=["lag_7", "lag_28", "mean_28"], inplace=True)
        cutoff = frame["date"].max() - pd.Timedelta(days=27)
        training = frame[frame["date"] < cutoff]
        validation = frame[frame["date"] >= cutoff]
        if len(training) < 100 or validation.empty:
            raise ValueError("Not enough dated retail history to train and validate the demand model.")

        model = HistGradientBoostingRegressor(
            max_iter=80,
            max_leaf_nodes=15,
            l2_regularization=2.0,
            early_stopping=True,
            random_state=42,
            categorical_features=[13, 14, 15, 16, 17],
        )
        model.fit(training[FEATURE_COLUMNS], training["actual_sales"])
        predicted = np.maximum(0, model.predict(validation[FEATURE_COLUMNS]))
        actual = validation["actual_sales"].to_numpy()
        seasonal = validation["lag_7"].to_numpy()
        denominator = max(float(actual.sum()), 1.0)
        info = {
            **signature,
            "trained_through": training["date"].max().date().isoformat(),
            "validated_from": validation["date"].min().date().isoformat(),
            "validated_to": validation["date"].max().date().isoformat(),
            "mae": float(mean_absolute_error(actual, predicted)),
            "wape": float(np.abs(actual - predicted).sum() / denominator * 100),
            "seasonal_naive_wape": float(np.abs(actual - seasonal).sum() / denominator * 100),
            "training_rows": int(len(training)),
            "validation_rows": int(len(validation)),
            "feature_count": len(FEATURE_COLUMNS),
            "algorithm": "HistGradientBoostingRegressor",
        }
        validation = validation[["date", "category", "actual_sales"]].copy()
        validation["predicted_sales"] = predicted
        MODEL_DIR.mkdir(exist_ok=True)
        joblib.dump({"signature": signature, "model": model, "info": info, "validation": validation}, MODEL_FILE)
        return model, info, validation

    def _init_database(self) -> None:
        with sqlite3.connect(DB_FILE) as connection:
            connection.execute(
                """CREATE TABLE IF NOT EXISTS recommendation_decisions (
                    recommendation_id TEXT PRIMARY KEY,
                    status TEXT NOT NULL CHECK(status IN ('approved', 'rejected')),
                    updated_at TEXT NOT NULL
                )"""
            )

    def _decisions(self) -> dict[str, str]:
        with sqlite3.connect(DB_FILE) as connection:
            return dict(connection.execute(
                "SELECT recommendation_id, status FROM recommendation_decisions"
            ).fetchall())

    def _recommend(self) -> list[dict]:
        latest = self.data.groupby(["sku_id", "store_id"], sort=False).tail(1).copy()
        history = self.data.groupby(["sku_id", "store_id"], sort=False).tail(28)
        demand = history.groupby(["sku_id", "store_id"])["actual_sales"].agg(["mean", "std"])
        latest = latest.join(demand, on=["sku_id", "store_id"], rsuffix="_history")
        decisions = self._decisions()
        rows = []
        for item in latest.itertuples(index=False):
            mean_demand = max(float(item.mean), 0)
            demand_std = max(float(item.std) if pd.notna(item.std) else 0, math.sqrt(mean_demand))
            lead_time = max(float(item.lead_time_days), 0)
            lead_std = max(float(item.lead_time_std_days), 0)
            safety_stock = Z_VALUE * math.sqrt(lead_time * demand_std**2 + mean_demand**2 * lead_std**2)
            reorder_point = mean_demand * lead_time + safety_stock
            inventory = max(float(item.available_inventory), 0)
            if inventory > reorder_point:
                continue
            moq = max(int(item.default_moq), 1)
            quantity = max(moq, math.ceil(reorder_point + mean_demand * 14 - inventory))
            risk = (reorder_point - inventory) / max(reorder_point, 1)
            action = "ORDER" if risk >= 0.25 else "HOLD"
            identity = f"REC-{item.sku_id}-{item.store_id}"
            rows.append({
                "id": identity,
                "action": action,
                "sku": item.sku_id,
                "skuName": item.product_name,
                "category": item.category,
                "supplier": f"{item.supplier_name} ({item.supplier_id})",
                "qty": quantity if action == "ORDER" else 0,
                "unitCost": float(item.unit_cost),
                "totalCost": float(quantity * item.unit_cost) if action == "ORDER" else 0,
                "rationale": (
                    f"{item.store_id}: available inventory {inventory:.0f} is "
                    f"{risk:.0%} below the data-derived reorder point "
                    f"({reorder_point:.1f} units). Based on the most recent 28 days "
                    "and the supplier's observed lead-time variability."
                ),
                "impact": [
                    f"Reorder point: {reorder_point:.1f} units",
                    f"Lead time: {lead_time:g} days",
                    f"MOQ: {moq} units",
                ],
                "confidence": float(min(0.99, max(0.5, 0.6 + min(risk, 1) * 0.35))),
                "urgency": "High" if risk >= 0.75 else "Medium" if risk >= 0.4 else "Low",
                "status": decisions.get(identity, "pending"),
                "store": item.store_id,
                "inventory": inventory,
                "reorderPoint": round(reorder_point, 2),
            })
        return sorted(rows, key=lambda rec: (rec["status"] != "pending", -rec["confidence"]))

    def run_cycle(self) -> dict:
        with self.lock:
            self.cycle_number += 1
            recommendations = self._recommend()
            suppliers = self.data.groupby(["supplier_id", "supplier_name"], as_index=False).agg(
                otif_pct=("otif_pct", "mean"),
                lead_time_days=("lead_time_days", "mean"),
                lead_time_std_days=("lead_time_std_days", "mean"),
            )
            highest_risk = suppliers.sort_values(["otif_pct", "lead_time_std_days"]).iloc[0]
            pending = sum(rec["status"] == "pending" for rec in recommendations)
            stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
            self.recommendations = recommendations
            self.logs = [
                {"time": stamp, "agent": "ORCH", "cls": "orch", "type": "info",
                 "msg": f"Cycle #{self.cycle_number} started; coordinating data-backed specialist agents."},
                {"time": stamp, "agent": "DEM", "cls": "dem", "type": "decision",
                 "msg": f"Demand model trained on {self.model_info['training_rows']:,} rows; holdout WAPE {self.model_info['wape']:.2f}% (seasonal-naive {self.model_info['seasonal_naive_wape']:.2f}%)."},
                {"time": stamp, "agent": "INV", "cls": "inv", "type": "decision",
                 "msg": f"Recalculated reorder points from the latest 28-day SKU/store demand history for {self.data['sku_id'].nunique() * self.data['store_id'].nunique():,} SKU/store combinations."},
                {"time": stamp, "agent": "LOG", "cls": "log", "type": "info",
                 "msg": f"Supplier telemetry analyzed; {highest_risk['supplier_name']} has the weakest observed OTIF ({highest_risk['otif_pct']:.1%})."},
                {"time": stamp, "agent": "RISK", "cls": "risk", "type": "conflict" if highest_risk["otif_pct"] < 0.95 else "info",
                 "msg": f"Risk review: {highest_risk['supplier_name']} lead time {highest_risk['lead_time_days']:.1f} days, standard deviation {highest_risk['lead_time_std_days']:.2f} days."},
                {"time": stamp, "agent": "FIN", "cls": "fin", "type": "info",
                 "msg": f"Procurement cost exposure for pending ORDER recommendations: ${sum(rec['totalCost'] for rec in recommendations if rec['action'] == 'ORDER' and rec['status'] == 'pending'):,.2f}."},
                {"time": stamp, "agent": "PROC", "cls": "proc", "type": "decision",
                 "msg": f"Generated {pending} pending dataset-based recommendations; all orders require human approval."},
                {"time": stamp, "agent": "ORCH", "cls": "orch", "type": "decision",
                 "msg": f"Cycle #{self.cycle_number} complete; {len(recommendations)} inventory exceptions reviewed."},
            ]
            self.conflicts = []
            if highest_risk["otif_pct"] < 0.95:
                self.conflicts.append({
                    "cycle": f"#{self.cycle_number}",
                    "agentA": "Risk Agent",
                    "agentB": "Finance Agent",
                    "type": "Service vs. Cost",
                    "posA": f"Review exposure from {highest_risk['supplier_name']} ({highest_risk['otif_pct']:.1%} OTIF).",
                    "posB": "Keep proposed spend within human-approved procurement limits.",
                    "resolution": "Flagged for human review; no purchase order was placed.",
                    "status": "Pending Human",
                })
            return {"cycle": self.cycle_number, "recommendation_count": len(recommendations)}

    def dashboard(self) -> dict:
        actual_total = float(self.data["actual_sales"].sum())
        category_rows = []
        grouped = self.validation.groupby("category").agg(
            actual=("actual_sales", "sum"),
            forecast=("predicted_sales", "sum"),
        )
        for category, item in grouped.iterrows():
            category_rows.append({
                "category": category,
                "actual": float(item["actual"]),
                "forecast": float(item["forecast"]),
                "wape": float(abs(item["forecast"] - item["actual"]) / max(item["actual"], 1) * 100),
            })
        supplier_rows = self.data.groupby(["supplier_id", "supplier_name"], as_index=False).agg(
            otif=("otif_pct", "mean"),
            fill_rate=("fill_rate_pct", "mean"),
            lead_time=("lead_time_days", "mean"),
            lead_time_std=("lead_time_std_days", "mean"),
            inventory_cost=("total_inventory_cost", "sum"),
        ).to_dict(orient="records")
        category_risk = self.data.groupby("category").agg(
            stockout_rate=("stockout_flag", "mean"),
            stockout_units=("stockout_units", "sum"),
        ).reset_index().to_dict(orient="records")
        daily_validation = self.validation.groupby("date").agg(
            actual=("actual_sales", "sum"),
            forecast=("predicted_sales", "sum"),
        ).reset_index()
        return {
            "status": "ready",
            "cycle": self.cycle_number,
            "dataset": {
                "file": str(FACT_FILE.relative_to(ROOT)),
                "rows": int(len(self.data)),
                "sku_count": int(self.data["sku_id"].nunique()),
                "store_count": int(self.data["store_id"].nunique()),
                "date_start": self.data["date"].min().date().isoformat(),
                "date_end": self.data["date"].max().date().isoformat(),
            },
            "metrics": {
                "actual_units": actual_total,
                "stockout_units": float(self.data["stockout_flag"].sum()),
                "observed_stockout_rate": float(self.data["stockout_flag"].mean() * 100),
                "inventory_cost": float(self.data["total_inventory_cost"].sum()),
                **self.model_info,
            },
            "categories": category_rows,
            "category_risk": category_risk,
            "daily_validation": [
                {
                    "date": item.date.date().isoformat(),
                    "actual": float(item.actual),
                    "forecast": float(item.forecast),
                }
                for item in daily_validation.itertuples(index=False)
            ],
            "suppliers": supplier_rows,
            "recommendations": self.recommendations[:50],
            "logs": self.logs,
            "conflicts": self.conflicts,
            "agents": [
                {"name": name, "state": "Active"}
                for name in ("Demand", "Inventory", "Procurement", "Logistics", "Risk", "Finance", "Orchestrator")
            ],
        }

    def scenario(self, demand_shock: float, lead_time_increase: float, disrupted_suppliers: int, safety_multiplier: float) -> dict:
        latest = self.data.groupby(["sku_id", "store_id"], sort=False).tail(1)
        recent = self.data.groupby(["sku_id", "store_id"], sort=False).tail(28)
        demand = recent.groupby(["sku_id", "store_id"])["actual_sales"].agg(["mean", "std"])
        snapshot = latest.join(demand, on=["sku_id", "store_id"], rsuffix="_history")
        suppliers = self.data.groupby("supplier_id")["otif_pct"].mean().sort_values()
        disrupted = set(suppliers.head(disrupted_suppliers).index)
        demand_means = snapshot["mean"].fillna(0).to_numpy(dtype=float) * (1 + demand_shock)
        demand_means = np.maximum(demand_means, 0)
        demand_stds = snapshot["std"].fillna(0).to_numpy(dtype=float)
        demand_stds = np.maximum(demand_stds, np.sqrt(np.maximum(snapshot["mean"].fillna(0).to_numpy(dtype=float), 0)))
        lead_times = snapshot["lead_time_days"].to_numpy(dtype=float) * (1 + lead_time_increase)
        lead_times += np.where(
            snapshot["supplier_id"].isin(disrupted),
            np.maximum(snapshot["lead_time_days"].to_numpy(dtype=float), 1),
            0,
        )
        lead_times = np.maximum(lead_times, 1)
        lead_std = np.maximum(snapshot["lead_time_std_days"].to_numpy(dtype=float), 0)
        safety = Z_VALUE * np.sqrt(
            lead_times * demand_stds**2 + demand_means**2 * lead_std**2
        ) * safety_multiplier
        baseline_safety = snapshot["safety_stock"].to_numpy(dtype=float)
        inventory = np.maximum(snapshot["available_inventory"].to_numpy(dtype=float), 0)
        inventory += np.maximum(safety - baseline_safety, 0)
        simulated_lead_demand = np.random.default_rng(42).normal(
            loc=demand_means * lead_times,
            scale=np.maximum(demand_stds * np.sqrt(lead_times), 1),
            size=(500, len(snapshot)),
        )
        shortages = np.maximum(simulated_lead_demand - inventory, 0)
        risk_pct = float(np.mean(simulated_lead_demand > inventory) * 100)
        expected_shortfall = float(shortages.sum(axis=1).mean())
        prices = np.maximum(snapshot["selling_price"].to_numpy(dtype=float), 0)
        estimated_lost_revenue = float((shortages * prices).sum(axis=1).mean())
        base_safety = float(snapshot["safety_stock"].mean())
        scenario_safety = float(np.mean(safety))
        network_mean = float(demand_means.sum())
        network_std = max(float(np.sqrt(np.square(demand_stds).sum())), 1)
        paths = np.maximum(
            np.random.default_rng(43).normal(network_mean, network_std, size=(500, 90)),
            0,
        )
        return {
            "stockout_risk_pct": risk_pct,
            "estimated_lost_revenue": estimated_lost_revenue,
            "safety_stock_units": scenario_safety,
            "baseline_safety_stock_units": base_safety,
            "additional_holding_cost": max(0, scenario_safety - base_safety)
            * float(snapshot["unit_cost"].mean())
            * float(snapshot["annual_holding_rate"].mean())
            * 90 / 365 * len(snapshot),
            "simulation_scope": f"{len(snapshot)} SKU/store records from the supplied dataset",
            "disrupted_suppliers": sorted(disrupted),
            "monte_carlo": {
                "simulations": int(paths.shape[0]),
                "days": list(range(paths.shape[1])),
                "p10": np.percentile(paths, 10, axis=0).round(0).tolist(),
                "p50": np.percentile(paths, 50, axis=0).round(0).tolist(),
                "p90": np.percentile(paths, 90, axis=0).round(0).tolist(),
                "expected_stockout_units": expected_shortfall,
            },
        }

    def answer(self, question: str) -> str:
        query = question.casefold()
        if any(term in query for term in ("accuracy", "wape", "mape", "forecast")):
            info = self.model_info
            return (
                f"The demand model is a {info['algorithm']} trained on {info['training_rows']:,} historical rows. "
                f"On a chronological holdout ({info['validated_from']}–{info['validated_to']}), "
                f"WAPE was {info['wape']:.2f}% and MAE was {info['mae']:.2f} units. "
                f"The 7-day seasonal-naive holdout WAPE was {info['seasonal_naive_wape']:.2f}%."
            )
        match = next((supplier for supplier in self.dashboard()["suppliers"]
                      if supplier["supplier_name"].casefold() in query
                      or supplier["supplier_id"].casefold() in query), None)
        if match or "supplier" in query or "gamma" in query:
            supplier = match or min(self.dashboard()["suppliers"], key=lambda item: item["otif"])
            return (
                f"{supplier['supplier_name']} ({supplier['supplier_id']}) has observed OTIF "
                f"{supplier['otif']:.1%}, average lead time {supplier['lead_time']:.1f} days "
                f"and lead-time standard deviation {supplier['lead_time_std']:.2f} days "
                "in the provided dataset."
            )
        if "sku_" in query:
            sku_id = query[query.find("sku_"):query.find("sku_") + 8].upper()
            rows = self.data[self.data["sku_id"] == sku_id]
            if not rows.empty:
                row = rows.iloc[-1]
                return (
                    f"{sku_id} ({row['category']}, {row['store_id']}): latest recorded available "
                    f"inventory {row['available_inventory']:.0f}; dataset reorder point "
                    f"{row['reorder_point']:.1f}; supplier {row['supplier_name']}."
                )
        if "category" in query or "food" in query or "beverage" in query:
            rows = self.dashboard()["categories"]
            match_category = next(
                (row for row in rows
                 if row["category"].casefold() in query
                 or row["category"].casefold().replace(" & ", " and ") in query
                 or row["category"].casefold().split(" & ")[0] in query),
                None,
            )
            if match_category:
                return (
                    f"{match_category['category']}: {match_category['actual']:,.0f} actual units and "
                    f"{match_category['forecast']:,.0f} model-predicted units across the chronological "
                    f"holdout; category WAPE {match_category['wape']:.2f}%."
                )
        if "recommend" in query or "approval" in query or "pending" in query:
            pending = [rec for rec in self.recommendations if rec["status"] == "pending"]
            return f"There are {len(pending)} pending recommendations based on current inventory and recent demand. Orders remain subject to human approval."
        return (
            f"The supplied retail dataset contains {len(self.data):,} dated SKU/store records "
            f"covering {self.data['date'].min().date()} to {self.data['date'].max().date()}. "
            "Ask about forecast accuracy, a supplier, an SKU, a category, or pending recommendations."
        )

    def decide(self, recommendation_id: str, decision: str) -> dict:
        rec = next((item for item in self.recommendations if item["id"] == recommendation_id), None)
        if rec is None:
            raise KeyError(recommendation_id)
        if rec["status"] != "pending":
            raise ValueError(f"Recommendation is already {rec['status']}.")
        timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with sqlite3.connect(DB_FILE) as connection:
            connection.execute(
                """INSERT INTO recommendation_decisions (recommendation_id, status, updated_at)
                   VALUES (?, ?, ?) ON CONFLICT(recommendation_id)
                   DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at""",
                (recommendation_id, decision, timestamp),
            )
        rec["status"] = decision
        return rec


system: SupplyChainSystem | None = None
app = FastAPI(title="Symphony Supply Chain Agent API", version="1.0.0")


class ScenarioRequest(BaseModel):
    demand_shock: float = Field(default=0, ge=-0.5, le=1.0)
    lead_time_increase: float = Field(default=0, ge=0, le=2.0)
    disrupted_suppliers: int = Field(default=0, ge=0, le=5)
    safety_stock_multiplier: float = Field(default=1, ge=0.5, le=3.0)


class CopilotRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class DecisionRequest(BaseModel):
    decision: Literal["approved", "rejected"]


@app.on_event("startup")
def initialize_system() -> None:
    global system
    system = SupplyChainSystem()


def _ready() -> SupplyChainSystem:
    if system is None:
        raise HTTPException(status_code=503, detail="Agent system is still initializing.")
    return system


@app.get("/api/health")
def health() -> dict:
    if system is None:
        return {"status": "initializing"}
    return {"status": "ready", "model": system.model_info["algorithm"], "cycle": system.cycle_number}


@app.get("/api/dashboard")
def dashboard() -> dict:
    return _ready().dashboard()


@app.post("/api/cycle")
def run_agent_cycle() -> dict:
    return _ready().run_cycle()


@app.get("/api/recommendations")
def recommendations() -> list[dict]:
    return _ready().recommendations


@app.post("/api/recommendations/{recommendation_id}/decision")
def decide(recommendation_id: str, request: DecisionRequest) -> dict:
    try:
        return _ready().decide(recommendation_id, request.decision)
    except KeyError as error:
        raise HTTPException(status_code=404, detail="Recommendation not found.") from error
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@app.post("/api/scenario")
def scenario(request: ScenarioRequest) -> dict:
    return _ready().scenario(
        request.demand_shock,
        request.lead_time_increase,
        request.disrupted_suppliers,
        request.safety_stock_multiplier,
    )


@app.post("/api/copilot")
def copilot(request: CopilotRequest) -> dict:
    return {"answer": _ready().answer(request.question)}


@app.get("/")
def index() -> FileResponse:
    return FileResponse(ROOT / "index.html")


@app.get("/{asset_name}")
def project_asset(asset_name: str) -> FileResponse:
    if asset_name not in {"styles.css", "data.js", "charts.js", "app.js"}:
        raise HTTPException(status_code=404, detail="Project asset not found.")
    return FileResponse(ROOT / asset_name)
