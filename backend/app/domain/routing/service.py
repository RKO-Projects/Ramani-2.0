from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.domain.routing.graph import build_adjacency, dijkstra, edge_key
from app.domain.routing.narrator import DISCLAIMER, avoided_landmarks, ussd_text
from app.domain.routing.safe_haven import nearest_safe_haven
from app.infrastructure.repositories.geospatial import GeospatialRepository
from app.infrastructure.repositories.incidents import PenaltyRepository
from app.schemas import RouteResponse


class RoutingService:
    def __init__(self, db: Session, settlement_id: str = settings.default_settlement) -> None:
        self.db = db
        self.settlement_id = settlement_id
        self.geo = GeospatialRepository(db, settlement_id)
        self.penalties = PenaltyRepository(db, settlement_id)

    def _graph_stale(self) -> bool:
        ingested = self.geo.latest_ingestion_at()
        if not ingested:
            return True
        if ingested.tzinfo is None:
            ingested = ingested.replace(tzinfo=timezone.utc)
        cutoff = datetime.now(timezone.utc) - timedelta(hours=settings.graph_stale_hours)
        return ingested < cutoff

    def route(self, from_landmark: str, to_landmark: str | None = None) -> RouteResponse:
        if self._graph_stale():
            raise ValueError("Graph data is stale; routing unavailable until ingestion completes.")

        landmarks = self.geo.list_landmarks()
        places = {item["id"]: item for item in landmarks}
        if from_landmark not in places:
            raise KeyError(from_landmark)

        edges = self.geo.list_edges()
        active = self.penalties.active_penalties()
        dest = to_landmark or nearest_safe_haven(from_landmark, edges, landmarks, active)[0]
        if dest not in places:
            raise KeyError(dest)

        graph = build_adjacency(edges, active)
        path, total_cost = dijkstra(graph, from_landmark, dest)
        if not path or total_cost == float("inf"):
            raise ValueError("No safe path between landmarks")

        names = [places[node]["name"] for node in path]
        name_map = {item["id"]: item["name"] for item in landmarks}
        avoided = avoided_landmarks(path, name_map, active, from_landmark)
        evidence = self.penalties.hazard_evidence()
        graph_version = self.geo.latest_graph_version()
        computed_at = datetime.now(timezone.utc)
        penalty_expiry = max(
            (datetime.fromisoformat(item["expires_at"]) for item in evidence),
            default=computed_at,
        )

        return RouteResponse(
            from_landmark=from_landmark,
            to_landmark=dest,
            path=path,
            names=names,
            ussd_text=ussd_text(names, avoided, places[dest]["name"]),
            avoided=avoided,
            disclaimer=DISCLAIMER,
            graph_version=graph_version,
            hazard_evidence=evidence,
            computed_at=computed_at,
            route_cost=round(total_cost, 3),
            penalty_expires_at=penalty_expiry,
        )

    def apply_hazard(
        self,
        *,
        from_landmark: str,
        to_landmark: str,
        kind: str,
        source: str,
        hazard_event_id: str,
    ) -> None:
        self.penalties.apply_hazard(
            from_landmark=from_landmark,
            to_landmark=to_landmark,
            kind=kind,
            source=source,
            hazard_event_id=hazard_event_id,
        )

    def landmarks(self) -> list[dict]:
        return self.geo.list_landmarks()

    def landmark_map(self) -> dict[str, dict]:
        return {item["id"]: item for item in self.geo.list_landmarks()}

    @staticmethod
    def edge_key(a: str, b: str) -> tuple[str, str]:
        return edge_key(a, b)
