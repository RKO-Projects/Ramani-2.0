from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.domain.routing.graph import build_adjacency, dijkstra
from app.domain.routing.safe_haven import nearest_safe_haven
from app.infrastructure.repositories.incidents import PenaltyRepository
from app.main import app
from app.services import ussd

client = TestClient(app)


def test_health() -> None:
    assert client.get("/health").json()["status"] == "ok"


def test_ready() -> None:
    assert client.get("/ready").json()["status"] == "ready"


def test_cvi_orders_high_risk_first() -> None:
    zones = client.get("/api/v1/cvi").json()["zones"]
    scores = [zone["cvi"] for zone in zones]
    assert scores == sorted(scores, reverse=True)
    assert zones[0]["id"] == "line-saba"


def test_route_avoids_copy() -> None:
    body = client.post("/api/v1/routes", json={"from_landmark": "line-saba"}).json()
    assert "EVACUATE NOW" in body["ussd_text"]
    assert body["to_landmark"] in {"highridge", "community-center"}
    assert body["graph_version"] >= 1


def test_ussd_menu(db: Session) -> None:
    reply = ussd.handle(db, "s1", "+254700000000", "")
    assert reply.startswith("CON Ramani")


def test_ussd_alert(db: Session) -> None:
    reply = ussd.handle(db, "s2", "+254700000000", "4")
    assert reply.startswith("END")


def test_hazard_reweights_graph(db: Session) -> None:
    client.post(
        "/api/v1/hazards",
        json={
            "kind": "rising_water",
            "from_landmark": "line-saba",
            "to_landmark": "main-drain-alley",
        },
    )
    penalties = PenaltyRepository(db).active_penalties()
    assert penalties[("line-saba", "main-drain-alley")] > 1


def test_sos_persists_after_new_session(db: Session) -> None:
    response = client.post(
        "/api/v1/sos",
        json={"kind": "medical", "landmark_id": "line-saba", "source": "pwa"},
        headers={"Idempotency-Key": "persist-sos-1"},
    )
    assert response.status_code == 200
    event_id = response.json()["id"]

    listed = client.get("/api/v1/sos").json()
    assert any(item["id"] == event_id for item in listed["items"])


def test_sos_hashes_phone_and_uses_cell_location() -> None:
    response = client.post(
        "/api/v1/sos",
        json={
            "kind": "stuck_debris",
            "source": "pwa",
            "phone": "+254712345678",
            "landmark_id": "laini-saba",
            "needs_medical": True,
        },
        headers={"Idempotency-Key": "hash-sos-1"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["kind"] == "stuck_debris"
    assert body["needs_medical"] is True
    assert body["phone_hash"]
    assert body["phone_masked"] == "+254 7XX XXX 678"
    assert body["location_hash"].startswith("cell:")
    assert "gps:" not in (body["note"] or "")


def test_whatsapp_sos_and_hazard() -> None:
    sos = client.post(
        "/api/v1/whatsapp",
        json={"from": "+254700000111", "text": "SOS medical laini saba injured"},
    )
    assert sos.status_code == 200
    assert sos.json()["type"] == "sos"
    listed = client.get("/api/v1/sos").json()["items"]
    match = next(item for item in listed if item["id"] == sos.json()["id"])
    assert match["source"] == "whatsapp"
    assert match["needs_medical"] is True
    assert match["landmark_id"] == "laini-saba"

    hazard = client.post(
        "/api/v1/whatsapp",
        json={"from": "+254700000111", "text": "HAZARD blocked drain line saba"},
    )
    assert hazard.status_code == 200
    assert hazard.json()["type"] == "hazard"


def test_hazard_optional_photo_under_limit() -> None:
    import base64

    tiny = base64.b64encode(b"\xff\xd8\xff" + b"x" * 40).decode()
    response = client.post(
        "/api/v1/hazards",
        json={
            "kind": "blocked_drainage",
            "from_landmark": "line-saba",
            "to_landmark": "main-drain-alley",
            "source": "pwa",
            "photo_b64": tiny,
        },
        headers={"Idempotency-Key": "photo-hazard-1"},
    )
    assert response.status_code == 200
    assert response.json()["has_photo"] is True
    assert "photo_b64" not in response.json()


def test_idempotent_sos() -> None:
    headers = {"Idempotency-Key": "same-sos-key"}
    first = client.post(
        "/api/v1/sos",
        json={"kind": "medical", "landmark_id": "line-saba"},
        headers=headers,
    ).json()
    second = client.post(
        "/api/v1/sos",
        json={"kind": "medical", "landmark_id": "line-saba"},
        headers=headers,
    ).json()
    assert first["id"] == second["id"]


def test_safe_haven_uses_weighted_cost() -> None:
    edges = [
        {"from": "a", "to": "b", "weight": 1.0, "flood_prone": False},
        {"from": "b", "to": "safe-short", "weight": 10.0, "flood_prone": False},
        {"from": "a", "to": "safe-long", "weight": 2.0, "flood_prone": False},
    ]
    landmarks = [
        {"id": "a", "safe_haven": False},
        {"id": "b", "safe_haven": False},
        {"id": "safe-short", "safe_haven": True},
        {"id": "safe-long", "safe_haven": True},
    ]
    haven, cost = nearest_safe_haven("a", edges, landmarks, {})
    assert haven == "safe-long"
    assert cost == 2.0


def test_expired_penalties_ignored(db: Session) -> None:
    repo = PenaltyRepository(db)
    past = datetime.now(timezone.utc) - timedelta(hours=1)
    row = repo.apply_hazard(
        from_landmark="line-saba",
        to_landmark="main-drain-alley",
        kind="rising_water",
        source="test",
        hazard_event_id="exp-test",
        ttl_hours=-1,
    )
    row.expires_at = past
    db.commit()
    assert repo.active_penalties(at=datetime.now(timezone.utc)) == {}


def test_disconnected_graph_returns_empty_path() -> None:
    edges = [{"from": "a", "to": "b", "weight": 1.0, "flood_prone": False}]
    graph = build_adjacency(edges, {})
    path, cost = dijkstra(graph, "a", "missing")
    assert path == []
    assert cost == float("inf")


def test_admin_settlements_without_key_when_auth_disabled() -> None:
    response = client.get("/api/v1/admin/settlements")
    assert response.status_code == 200
    assert any(item["id"] == "kibera" for item in response.json())


def test_mathare_bootstrap() -> None:
    response = client.post("/api/v1/admin/settlements/mathare/bootstrap")
    assert response.status_code == 200
    assert response.json()["settlement"] == "mathare"


def test_area_map_and_detail() -> None:
    payload = client.get("/api/v1/areas").json()
    assert payload["settlement_id"] == "kibera"
    ids = {node["id"] for node in payload["nodes"]}
    assert "line-saba" in ids
    drain = next(node for node in payload["nodes"] if node["id"] == "main-drain-alley")
    assert drain["alarm"] is True
    detail = client.get("/api/v1/areas/line-saba").json()
    assert detail["id"] == "line-saba"
    assert detail["next_steps"]


def test_ticket_lookup_and_whatsapp_guide() -> None:
    created = client.post(
        "/api/v1/sos",
        json={"kind": "medical", "landmark_id": "olympic", "source": "pwa"},
        headers={"Idempotency-Key": "ticket-lookup-1"},
    ).json()
    ticket = client.get(f"/api/v1/tickets/{created['id']}")
    assert ticket.status_code == 200
    body = ticket.json()
    assert body["id"] == created["id"]
    assert body["status"] == "open"
    assert "phone" not in body
    assert body["next_steps"]
    guide = client.get("/api/v1/whatsapp/guide").json()
    assert "{kind}" in guide["templates"]["sos"]
    assert len(guide["steps"]) == 3


def test_public_hazard_and_whatsapp_dispatch() -> None:
    hazard = client.post(
        "/api/v1/hazards",
        json={"kind": "rising_water", "from_landmark": "olympic", "to_landmark": "community-center"},
        headers={"Idempotency-Key": "hazard-public-1"},
    ).json()
    public = client.get(f"/api/v1/hazards/{hazard['id']}")
    assert public.status_code == 200
    assert public.json()["id"] == hazard["id"]
    assert public.json()["next_steps"]

    dispatched = client.post(
        "/api/v1/whatsapp/dispatch",
        json={"action": "sos", "kind": "flood_trapped", "landmark_id": "silanga", "phone": "+254700000222"},
    )
    assert dispatched.status_code == 200
    payload = dispatched.json()
    assert payload["type"] == "sos"
    assert payload["id"]
    assert "Ticket" in payload["message"]
    follow = client.get(f"/api/v1/tickets/{payload['id']}")
    assert follow.status_code == 200

    route = client.post(
        "/api/v1/whatsapp",
        json={"from": "+254700000333", "text": "Need evacuation route from olympic"},
    )
    assert route.status_code == 200
    assert route.json()["type"] == "route"
