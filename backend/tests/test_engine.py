from fastapi.testclient import TestClient

from app.main import app
from app.services import routing, ussd

client = TestClient(app)


def test_health() -> None:
    assert client.get("/health").json()["status"] == "ok"


def test_cvi_orders_high_risk_first() -> None:
    zones = client.get("/api/v1/cvi").json()["zones"]
    scores = [zone["cvi"] for zone in zones]
    assert scores == sorted(scores, reverse=True)
    assert zones[0]["id"] == "line-saba"


def test_route_avoids_copy() -> None:
    body = client.post("/api/v1/routes", json={"from_landmark": "line-saba"}).json()
    assert "EVACUATE NOW" in body["ussd_text"]
    assert body["to_landmark"] in {"highridge", "community-center"}


def test_ussd_menu() -> None:
    reply = ussd.handle("s1", "+254700000000", "")
    assert reply.startswith("CON Ramani")


def test_ussd_alert() -> None:
    reply = ussd.handle("s2", "+254700000000", "4")
    assert reply.startswith("END")


def test_hazard_reweights_graph() -> None:
    routing.edge_penalties.clear()
    client.post(
        "/api/v1/hazards",
        json={
            "kind": "rising_water",
            "from_landmark": "line-saba",
            "to_landmark": "main-drain-alley",
        },
    )
    assert routing.edge_penalties[("line-saba", "main-drain-alley")] > 1
