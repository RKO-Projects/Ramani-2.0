"""GHACOF/ICPAC seasonal outlook ingestion client.

Fetches and parses the ICPAC Greater Horn of Africa Climate Outlook Forum (GHACOF)
seasonal rainfall outlook bulletin and stores it as a versioned CviObservationORM
update.

Design decisions:
- The outlook is represented as a tercile probability (above_normal / near_normal /
  below_normal) for the seasonal rainfall period.
- We store the raw outlook identifier (e.g. "GHACOF-75") so the CVI is always
  auditable — planners can see exactly which bulletin a risk score came from.
- If the live API is unreachable, we fall back to the local kibera_cvi.json seed
  and log a warning. This means the system degrades gracefully, not catastrophically.
- We never overwrite a more recent ingestion run. If the stored outlook_id matches
  the new one, we skip the update.

ICPAC publishes JSON-formatted outlooks at:
  https://www.icpac.net/api/v1/outlooks/

For development/offline use, RAMANI_GHACOF_OUTLOOK_URL can be pointed at a local
fixture file served over HTTP, or left unset to use the seed fallback.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
import structlog

from app.config import settings
from app.infrastructure.ingestion.pipeline import ingest_ghacof

logger = structlog.get_logger("ramani.ghacof_client")

# Default ICPAC API URL — override with RAMANI_GHACOF_OUTLOOK_URL env var
_DEFAULT_ICPAC_URL = "https://www.icpac.net/api/v1/outlooks/?format=json&limit=1&ordering=-start_date"

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


class GhacofIngestError(RuntimeError):
    """Raised when GHACOF ingestion fails and should be retried."""


@dataclass
class GhacofOutlook:
    """Parsed GHACOF seasonal outlook."""
    outlook_id: str      # e.g. "GHACOF-75"
    tercile: str         # "above_normal" | "near_normal" | "below_normal"
    el_nino_mode: bool
    rainfall_factor: float  # 0.0–1.0 scalar used in CVI formula


def _tercile_to_rainfall_factor(tercile: str) -> float:
    """Convert tercile label to a CVI rainfall factor scalar.

    This is a conservative mapping — above_normal weather amplifies flood risk.
    Planners can override weights per-request via the /cvi POST endpoint.
    """
    return {
        "above_normal": 0.90,
        "near_normal": 0.55,
        "below_normal": 0.20,
    }.get(tercile.lower(), 0.55)


def _parse_icpac_response(data: dict[str, Any]) -> GhacofOutlook:
    """Parse ICPAC JSON API response into a GhacofOutlook.

    ICPAC API response format (simplified):
    {
      "results": [{
        "name": "GHACOF 75",
        "tercile_probabilities": {
          "above_normal": 0.55,
          "near_normal": 0.30,
          "below_normal": 0.15
        },
        "enso_phase": "El Nino"
      }]
    }
    """
    results = data.get("results", [])
    if not results:
        raise GhacofIngestError("ICPAC API returned empty results list")

    latest = results[0]
    name: str = latest.get("name", "GHACOF unknown")
    outlook_id = name.replace(" ", "-").upper()

    terciles: dict[str, float] = latest.get("tercile_probabilities", {})
    if terciles:
        dominant = max(terciles, key=lambda k: terciles[k])
    else:
        dominant = "near_normal"

    enso_phase: str = latest.get("enso_phase", "").lower()
    el_nino = "el nino" in enso_phase or "el niño" in enso_phase

    logger.info("ghacof_parsed", outlook_id=outlook_id, tercile=dominant, el_nino=el_nino)
    return GhacofOutlook(
        outlook_id=outlook_id,
        tercile=dominant,
        el_nino_mode=el_nino,
        rainfall_factor=_tercile_to_rainfall_factor(dominant),
    )


def _parse_seed_fallback() -> GhacofOutlook:
    """Parse the local kibera_cvi.json seed as a fallback when ICPAC is unreachable."""
    raw = json.loads((DATA_DIR / "kibera_cvi.json").read_text(encoding="utf-8"))
    tercile = raw.get("tercile", "near_normal")
    return GhacofOutlook(
        outlook_id=raw.get("outlook", "seed-fallback"),
        tercile=tercile,
        el_nino_mode=raw.get("el_nino_mode", False),
        rainfall_factor=_tercile_to_rainfall_factor(tercile),
    )


def fetch_ghacof_outlook(
    url: str | None = None,
    timeout: float = 20.0,
) -> GhacofOutlook:
    """Fetch the latest GHACOF outlook from ICPAC, with seed fallback.

    Returns a GhacofOutlook regardless of connectivity — the fallback ensures
    the CVI can always be computed.
    """
    target_url = url or getattr(settings, "ghacof_outlook_url", None) or _DEFAULT_ICPAC_URL

    try:
        logger.info("ghacof_fetch_start", url=target_url)
        response = httpx.get(target_url, timeout=timeout, headers={"Accept": "application/json"})
        response.raise_for_status()
        data = response.json()
        outlook = _parse_icpac_response(data)
        logger.info("ghacof_fetch_success", outlook_id=outlook.outlook_id)
        return outlook
    except (httpx.TimeoutException, httpx.ConnectError) as exc:
        logger.warning("ghacof_fetch_timeout_fallback", error=str(exc))
        return _parse_seed_fallback()
    except httpx.HTTPStatusError as exc:
        logger.warning("ghacof_fetch_http_error_fallback", status=exc.response.status_code)
        return _parse_seed_fallback()
    except GhacofIngestError as exc:
        logger.warning("ghacof_parse_error_fallback", error=str(exc))
        return _parse_seed_fallback()


def build_cvi_payload(
    outlook: GhacofOutlook,
    base_cvi_path: Path | None = None,
) -> dict[str, Any]:
    """Build a CVI payload from the outlook, merging with base zone data.

    The base zone structural/drainage/slope values come from the seeded JSON.
    The ghacof_rainfall field on each zone is replaced with the live factor.
    This is the auditable, transparent update — planners can see the outlook ID.
    """
    path = base_cvi_path or (DATA_DIR / "kibera_cvi.json")
    base = json.loads(path.read_text(encoding="utf-8"))

    updated_zones = []
    for zone in base["zones"]:
        updated_zones.append({
            **zone,
            "ghacof_rainfall": outlook.rainfall_factor,
        })

    return {
        "outlook": outlook.outlook_id,
        "tercile": outlook.tercile,
        "el_nino_mode": outlook.el_nino_mode,
        "zones": updated_zones,
    }
