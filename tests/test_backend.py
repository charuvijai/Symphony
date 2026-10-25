from fastapi.testclient import TestClient

from backend.main import app


def test_dashboard_agents_scenario_and_copilot():
    with TestClient(app) as client:
        health = client.get("/api/health")
        assert health.status_code == 200
        assert health.json()["status"] == "ready"

        dashboard = client.get("/api/dashboard")
        assert dashboard.status_code == 200
        data = dashboard.json()
        assert data["dataset"]["rows"] > 120_000
        assert data["metrics"]["training_rows"] > 0
        assert data["metrics"]["validation_rows"] > 0
        assert len(data["categories"]) == 6
        assert len(data["daily_validation"]) == 28
        assert data["logs"]

        scenario = client.post("/api/scenario", json={
            "demand_shock": 0.2,
            "lead_time_increase": 0.5,
            "disrupted_suppliers": 1,
            "safety_stock_multiplier": 1.5,
        })
        assert scenario.status_code == 200
        result = scenario.json()
        assert result["monte_carlo"]["simulations"] == 500
        assert len(result["monte_carlo"]["p50"]) == 90
        assert 0 <= result["stockout_risk_pct"] <= 100

        answer = client.post("/api/copilot", json={"question": "What is forecast accuracy?"})
        assert answer.status_code == 200
        assert "chronological holdout" in answer.json()["answer"]
