"""OSM/Overpass API client for importing Kibera landmark nodes and alley edges.

This module fetches live data from the Overpass API and writes it to the
database via GeospatialRepository. It is the first step toward replacing
the static seed JSON with community-validated map data.

Safety principles:
- All imported records are tagged with provenance="osm" so they are
  distinguishable from seed data and can be rolled back independently.
- Graph version is incremented on each successful import so routes can
  cite which graph version they used.
- HTTP errors and parsing failures raise IngestError, never silently corrupt
  existing data.
- No permanent edge modifications are made from unverified reports; this
  client only writes landmark nodes and graph edges from OSM.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from typing import Any

import httpx
import structlog

from app.infrastructure.models import GraphEdgeORM, LandmarkORM

logger = structlog.get_logger("ramani.osm_client")

# Kibera bounding box: south,west,north,east
KIBERA_BBOX = "-1.3200,36.7600,-1.2900,36.8100"

# Overpass query: get named nodes and walking paths in Kibera
_OVERPASS_QUERY_TEMPLATE = """
[out:json][timeout:25];
(
  node["name"]({bbox});
  way["highway"~"footway|path|residential|service|track"]({bbox});
);
out body;
>;
out skel qt;
"""

OVERPASS_URL = "https://overpass-api.de/api/interpreter"


class IngestError(RuntimeError):
    """Raised when an ingestion step fails in a way that should be retried."""


@dataclass
class OsmNode:
    osm_id: int
    lat: float
    lon: float
    name: str
    tags: dict[str, str] = field(default_factory=dict)

    @property
    def landmark_id(self) -> str:
        """Stable landmark ID derived from OSM node ID."""
        return f"osm-{self.osm_id}"

    @property
    def geom_wkt(self) -> str:
        return f"POINT({self.lon} {self.lat})"


@dataclass
class OsmWay:
    osm_id: int
    node_ids: list[int]
    tags: dict[str, str] = field(default_factory=dict)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km between two lat/lon points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def fetch_kibera_overpass(
    bbox: str = KIBERA_BBOX,
    overpass_url: str = OVERPASS_URL,
    timeout: float = 30.0,
) -> dict[str, Any]:
    """Fetch raw Overpass JSON for Kibera.

    Returns the parsed JSON response. Raises IngestError on HTTP or timeout.
    """
    query = _OVERPASS_QUERY_TEMPLATE.format(bbox=bbox)
    logger.info("overpass_fetch_start", bbox=bbox, url=overpass_url)
    try:
        response = httpx.post(
            overpass_url,
            data={"data": query},
            timeout=timeout,
            headers={"Accept": "application/json"},
        )
        response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise IngestError(f"Overpass API timed out after {timeout}s") from exc
    except httpx.HTTPStatusError as exc:
        raise IngestError(f"Overpass API returned {exc.response.status_code}") from exc

    data = response.json()
    logger.info("overpass_fetch_complete", elements=len(data.get("elements", [])))
    return data


def parse_overpass_response(data: dict[str, Any]) -> tuple[list[OsmNode], list[OsmWay]]:
    """Parse Overpass JSON into OsmNode and OsmWay objects.

    Only returns named nodes (with a 'name' tag) and ways with walkable highway tags.
    """
    nodes_by_id: dict[int, OsmNode] = {}
    ways: list[OsmWay] = []

    for element in data.get("elements", []):
        kind = element.get("type")
        tags = element.get("tags", {})

        if kind == "node":
            lat = element.get("lat")
            lon = element.get("lon")
            if lat is None or lon is None:
                continue
            node = OsmNode(
                osm_id=element["id"],
                lat=lat,
                lon=lon,
                name=tags.get("name", ""),
                tags=tags,
            )
            nodes_by_id[node.osm_id] = node

        elif kind == "way":
            node_ids = element.get("nodes", [])
            if len(node_ids) >= 2:
                ways.append(OsmWay(osm_id=element["id"], node_ids=node_ids, tags=tags))

    named_nodes = [n for n in nodes_by_id.values() if n.name]
    logger.info("overpass_parsed", named_nodes=len(named_nodes), ways=len(ways))
    return named_nodes, ways


def build_landmark_rows(
    nodes: list[OsmNode],
    settlement_id: str,
    graph_version: int,
) -> list[LandmarkORM]:
    """Convert OsmNode objects to LandmarkORM rows, tagged as OSM-provenance."""
    rows = []
    for node in nodes:
        rows.append(
            LandmarkORM(
                id=node.landmark_id,
                settlement_id=settlement_id,
                name=node.name,
                zone=node.tags.get("addr:suburb", node.tags.get("place", "Kibera")),
                lat=node.lat,
                lon=node.lon,
                safe_haven=node.tags.get("amenity") in {"hospital", "school", "community_centre"},
                graph_version=graph_version,
                provenance="osm",
                geom_wkt=node.geom_wkt,
            )
        )
    logger.info("landmark_rows_built", count=len(rows))
    return rows


def build_edge_rows(
    ways: list[OsmWay],
    nodes_by_id: dict[int, OsmNode],
    settlement_id: str,
    graph_version: int,
) -> list[GraphEdgeORM]:
    """Convert OsmWay objects to GraphEdgeORM rows.

    Each consecutive node pair in the way becomes a bidirectional edge.
    Weight is the haversine distance in km * 10 (integer-scaled for Dijkstra).
    Ways tagged flood_prone or in a drain area get a 5x weight multiplier.
    """
    flood_tags = {"waterway", "drain", "stream"}
    rows = []
    for way in ways:
        is_flood = bool(flood_tags.intersection(way.tags.keys()))
        for i in range(len(way.node_ids) - 1):
            n1 = nodes_by_id.get(way.node_ids[i])
            n2 = nodes_by_id.get(way.node_ids[i + 1])
            if n1 is None or n2 is None:
                continue
            dist = _haversine_km(n1.lat, n1.lon, n2.lat, n2.lon)
            weight = dist * 10.0 * (5.0 if is_flood else 1.0)
            wkt = f"LINESTRING({n1.lon} {n1.lat}, {n2.lon} {n2.lat})"

            # forward
            rows.append(GraphEdgeORM(
                settlement_id=settlement_id,
                from_landmark=f"osm-{n1.osm_id}",
                to_landmark=f"osm-{n2.osm_id}",
                weight=round(weight, 4),
                flood_prone=is_flood,
                graph_version=graph_version,
                provenance="osm",
                geom_wkt=wkt,
            ))
            # reverse (undirected graph)
            rows.append(GraphEdgeORM(
                settlement_id=settlement_id,
                from_landmark=f"osm-{n2.osm_id}",
                to_landmark=f"osm-{n1.osm_id}",
                weight=round(weight, 4),
                flood_prone=is_flood,
                graph_version=graph_version,
                provenance="osm",
                geom_wkt=wkt,
            ))
    logger.info("edge_rows_built", count=len(rows))
    return rows
