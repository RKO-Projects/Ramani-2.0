"""Tests for Priority 2: OSM ingestion client and GHACOF client.

These tests are fully offline — no real HTTP calls are made. All external
requests are intercepted with httpx.MockTransport / monkeypatching.
"""

import json

import pytest

from app.infrastructure.ingestion.ghacof_client import (
    GhacofOutlook,
    _parse_icpac_response,
    _parse_seed_fallback,
    _tercile_to_rainfall_factor,
    build_cvi_payload,
    fetch_ghacof_outlook,
)
from app.infrastructure.ingestion.osm_client import (
    IngestError,
    OsmNode,
    OsmWay,
    _haversine_km,
    build_edge_rows,
    build_landmark_rows,
    parse_overpass_response,
)


# ---------------------------------------------------------------------------
# OSM client tests
# ---------------------------------------------------------------------------


class TestHaversine:
    def test_zero_distance(self):
        assert _haversine_km(0, 0, 0, 0) == pytest.approx(0.0)

    def test_known_distance(self):
        # Nairobi CBD to ~1km east is roughly 0.009 degrees lon
        dist = _haversine_km(-1.2833, 36.8172, -1.2833, 36.8261)
        assert 0.8 < dist < 1.2, f"Expected ~1km, got {dist:.3f}"


class TestParseOverpassResponse:
    _sample = {
        "elements": [
            {
                "type": "node",
                "id": 123,
                "lat": -1.3136,
                "lon": 36.7889,
                "tags": {"name": "Line Saba"},
            },
            {
                "type": "node",
                "id": 456,
                "lat": -1.3140,
                "lon": 36.7900,
                "tags": {"name": "Silanga Market"},
            },
            {
                "type": "node",
                "id": 789,
                "lat": -1.3150,
                "lon": 36.7910,
                "tags": {},  # unnamed — should be excluded from named_nodes
            },
            {
                "type": "way",
                "id": 999,
                "nodes": [123, 456],
                "tags": {"highway": "footway"},
            },
        ]
    }

    def test_named_nodes_extracted(self):
        nodes, ways = parse_overpass_response(self._sample)
        assert len(nodes) == 2
        names = {n.name for n in nodes}
        assert names == {"Line Saba", "Silanga Market"}

    def test_unnamed_nodes_excluded(self):
        nodes, _ = parse_overpass_response(self._sample)
        assert all(n.name for n in nodes)

    def test_ways_extracted(self):
        _, ways = parse_overpass_response(self._sample)
        assert len(ways) == 1
        assert ways[0].osm_id == 999

    def test_empty_response(self):
        nodes, ways = parse_overpass_response({"elements": []})
        assert nodes == []
        assert ways == []


class TestBuildLandmarkRows:
    def test_rows_created(self):
        nodes = [
            OsmNode(osm_id=123, lat=-1.3136, lon=36.7889, name="Line Saba"),
            OsmNode(osm_id=456, lat=-1.3140, lon=36.7900, name="Silanga"),
        ]
        rows = build_landmark_rows(nodes, settlement_id="kibera", graph_version=2)
        assert len(rows) == 2
        assert all(r.provenance == "osm" for r in rows)
        assert all(r.graph_version == 2 for r in rows)
        assert all(r.geom_wkt.startswith("POINT(") for r in rows)

    def test_safe_haven_flag(self):
        node = OsmNode(
            osm_id=111, lat=-1.31, lon=36.78,
            name="Community Center",
            tags={"amenity": "community_centre"},
        )
        rows = build_landmark_rows([node], settlement_id="kibera", graph_version=1)
        assert rows[0].safe_haven is True

    def test_landmark_id_format(self):
        node = OsmNode(osm_id=42, lat=0.0, lon=0.0, name="Test")
        rows = build_landmark_rows([node], settlement_id="kibera", graph_version=1)
        assert rows[0].id == "osm-42"


class TestBuildEdgeRows:
    def test_bidirectional_edges(self):
        node1 = OsmNode(osm_id=1, lat=-1.313, lon=36.788, name="A")
        node2 = OsmNode(osm_id=2, lat=-1.314, lon=36.789, name="B")
        nodes_by_id = {1: node1, 2: node2}
        way = OsmWay(osm_id=99, node_ids=[1, 2], tags={"highway": "footway"})
        rows = build_edge_rows([way], nodes_by_id, "kibera", 1)
        # One way → two edges (forward + reverse)
        assert len(rows) == 2
        from_ids = {r.from_landmark for r in rows}
        assert "osm-1" in from_ids
        assert "osm-2" in from_ids

    def test_flood_prone_weight_multiplier(self):
        node1 = OsmNode(osm_id=10, lat=-1.313, lon=36.788, name="A")
        node2 = OsmNode(osm_id=20, lat=-1.314, lon=36.789, name="B")
        nodes_by_id = {10: node1, 20: node2}

        normal_way = OsmWay(osm_id=1, node_ids=[10, 20], tags={"highway": "footway"})
        flood_way = OsmWay(osm_id=2, node_ids=[10, 20], tags={"waterway": "drain"})

        normal_rows = build_edge_rows([normal_way], nodes_by_id, "kibera", 1)
        flood_rows = build_edge_rows([flood_way], nodes_by_id, "kibera", 1)

        normal_weight = normal_rows[0].weight
        flood_weight = flood_rows[0].weight
        # flood penalty is 5x
        assert flood_weight == pytest.approx(normal_weight * 5.0, rel=0.01)

    def test_linestring_geom_wkt(self):
        node1 = OsmNode(osm_id=1, lat=-1.313, lon=36.788, name="A")
        node2 = OsmNode(osm_id=2, lat=-1.314, lon=36.789, name="B")
        nodes_by_id = {1: node1, 2: node2}
        way = OsmWay(osm_id=99, node_ids=[1, 2], tags={})
        rows = build_edge_rows([way], nodes_by_id, "kibera", 1)
        assert all(r.geom_wkt.startswith("LINESTRING(") for r in rows)


# ---------------------------------------------------------------------------
# GHACOF client tests
# ---------------------------------------------------------------------------


class TestTercileToRainfallFactor:
    def test_above_normal(self):
        assert _tercile_to_rainfall_factor("above_normal") == pytest.approx(0.90)

    def test_near_normal(self):
        assert _tercile_to_rainfall_factor("near_normal") == pytest.approx(0.55)

    def test_below_normal(self):
        assert _tercile_to_rainfall_factor("below_normal") == pytest.approx(0.20)

    def test_unknown_defaults_to_near_normal(self):
        assert _tercile_to_rainfall_factor("unknown_value") == pytest.approx(0.55)


class TestParseIcpacResponse:
    _sample = {
        "results": [
            {
                "name": "GHACOF 75",
                "tercile_probabilities": {
                    "above_normal": 0.55,
                    "near_normal": 0.30,
                    "below_normal": 0.15,
                },
                "enso_phase": "El Nino",
            }
        ]
    }

    def test_outlook_id(self):
        outlook = _parse_icpac_response(self._sample)
        assert outlook.outlook_id == "GHACOF-75"

    def test_dominant_tercile(self):
        outlook = _parse_icpac_response(self._sample)
        assert outlook.tercile == "above_normal"

    def test_el_nino_detection(self):
        outlook = _parse_icpac_response(self._sample)
        assert outlook.el_nino_mode is True

    def test_no_el_nino(self):
        data = {
            "results": [{
                "name": "GHACOF 74",
                "tercile_probabilities": {"near_normal": 0.5},
                "enso_phase": "neutral",
            }]
        }
        outlook = _parse_icpac_response(data)
        assert outlook.el_nino_mode is False

    def test_empty_results_raises(self):
        from app.infrastructure.ingestion.ghacof_client import GhacofIngestError
        with pytest.raises(GhacofIngestError):
            _parse_icpac_response({"results": []})


class TestParseSeedFallback:
    def test_returns_outlook(self):
        outlook = _parse_seed_fallback()
        assert isinstance(outlook, GhacofOutlook)
        assert outlook.outlook_id  # non-empty
        assert outlook.tercile in {"above_normal", "near_normal", "below_normal"}


class TestBuildCviPayload:
    def test_zones_updated_with_live_factor(self):
        outlook = GhacofOutlook(
            outlook_id="GHACOF-75",
            tercile="above_normal",
            el_nino_mode=True,
            rainfall_factor=0.90,
        )
        payload = build_cvi_payload(outlook)
        assert payload["outlook"] == "GHACOF-75"
        assert payload["tercile"] == "above_normal"
        assert payload["el_nino_mode"] is True
        for zone in payload["zones"]:
            assert zone["ghacof_rainfall"] == pytest.approx(0.90)

    def test_structural_values_preserved(self):
        """Non-rainfall zone values must not be altered by the live outlook."""
        outlook = GhacofOutlook(
            outlook_id="test", tercile="near_normal",
            el_nino_mode=False, rainfall_factor=0.55,
        )
        payload = build_cvi_payload(outlook)
        for zone in payload["zones"]:
            assert "drainage_proximity" in zone
            assert "structural_density" in zone
            assert "elevation_slope" in zone


class TestFetchGhacofOutlookFallback:
    def test_connection_error_falls_back_to_seed(self, monkeypatch):
        """If ICPAC is unreachable, fetch_ghacof_outlook must return seed data."""
        import httpx
        from app.infrastructure.ingestion import ghacof_client

        def mock_get(*args, **kwargs):
            raise httpx.ConnectError("unreachable")

        monkeypatch.setattr(httpx, "get", mock_get)
        outlook = fetch_ghacof_outlook(url="https://example.invalid/")
        assert isinstance(outlook, GhacofOutlook)
        assert outlook.outlook_id  # seed fallback still has an ID
