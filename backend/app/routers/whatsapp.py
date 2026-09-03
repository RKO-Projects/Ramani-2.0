from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse

from app.config import settings
from app.deps import get_incident_service
from app.domain.incidents import IncidentService
from app.infrastructure.ingestion.pipeline import normalize_phone
from app.infrastructure.whatsapp import extract_cloud_messages, parse_resident_text

router = APIRouter(prefix="/api/v1", tags=["whatsapp"])


@router.get("/whatsapp")
def verify_whatsapp(
    hub_mode: str | None = Query(default=None, alias="hub.mode"),
    hub_challenge: str | None = Query(default=None, alias="hub.challenge"),
    hub_verify_token: str | None = Query(default=None, alias="hub.verify_token"),
) -> PlainTextResponse:
    if hub_mode == "subscribe" and settings.whatsapp_verify_token and hub_verify_token == settings.whatsapp_verify_token:
        return PlainTextResponse(hub_challenge or "")
    if not settings.whatsapp_verify_token:
        return PlainTextResponse(hub_challenge or "ok")
    raise HTTPException(status_code=403, detail="Invalid WhatsApp verify token")


def _handle_message(
    service: IncidentService,
    sender: str,
    text: str,
    lat: float | None,
    lon: float | None,
) -> dict:
    phone = normalize_phone(sender)
    action, kind, landmark = parse_resident_text(text)
    if action == "hazard":
        from_landmark = landmark or "laini-saba"
        to_landmark = "main-drain-alley" if from_landmark != "main-drain-alley" else "silanga"
        hazard_kind = kind if kind in {"blocked_drainage", "rising_water", "damaged_structure"} else "blocked_drainage"
        event = service.add_hazard(
            kind=hazard_kind,
            from_landmark=from_landmark,
            to_landmark=to_landmark,
            source="whatsapp",
            note=text[:240],
        )
        return {"ok": True, "channel": "whatsapp", "type": "hazard", "id": event.id}
    sos_kind = kind if kind not in {"blocked_drainage", "rising_water", "damaged_structure"} else "flood_trapped"
    event = service.add_sos(
        kind=sos_kind,
        landmark_id=landmark,
        phone=phone,
        source="whatsapp",
        note=text[:240],
        lat=lat,
        lon=lon,
        needs_medical="injur" in text.lower() or sos_kind == "medical",
    )
    return {"ok": True, "channel": "whatsapp", "type": "sos", "id": event.id}


@router.post("/whatsapp")
async def whatsapp_inbound(
    request: Request,
    service: IncidentService = Depends(get_incident_service),
) -> dict:
    payload = await request.json()
    if payload.get("object") == "whatsapp_business_account" or "entry" in payload:
        results = []
        for sender, text, lat, lon in extract_cloud_messages(payload):
            if sender:
                results.append(_handle_message(service, sender, text, lat, lon))
        return {"ok": True, "handled": len(results), "results": results}

    sender = payload.get("from") or payload.get("sender") or ""
    if not sender:
        raise HTTPException(status_code=400, detail="WhatsApp sender is required")
    return _handle_message(
        service,
        sender,
        payload.get("text") or "SOS",
        payload.get("lat"),
        payload.get("lon"),
    )
