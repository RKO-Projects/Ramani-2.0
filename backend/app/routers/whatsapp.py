from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse

from app.config import settings
from app.deps import get_incident_service, get_routing_service
from app.domain.incidents import IncidentService
from app.domain.routing.service import RoutingService
from app.infrastructure.ingestion.pipeline import normalize_phone
from app.infrastructure.whatsapp import extract_cloud_messages, parse_resident_text
from app.routers.incidents import public_ticket
from app.schemas import WhatsAppDispatchIn, WhatsAppDispatchOut, WhatsAppGuide

router = APIRouter(prefix="/api/v1", tags=["whatsapp"])

SOS_KINDS = {
    "flood_trapped",
    "collapse_fire",
    "medical",
    "stuck_debris",
    "stuck_location",
    "car_flooding",
}
HAZARD_KINDS = {"blocked_drainage", "rising_water", "damaged_structure"}


def _channel_number() -> str | None:
    for item in settings.whatsapp_responder_list:
        digits = "".join(ch for ch in item if ch.isdigit())
        if len(digits) >= 9:
            return item
    return None


def _wa_url(message: str) -> str | None:
    number = _channel_number()
    if not number:
        return None
    digits = "".join(ch for ch in number if ch.isdigit())
    return f"https://wa.me/{digits}?text={quote(message)}"


def _guide_steps() -> list[str]:
    return [
        "Pick SOS, a blocked path, or a route request.",
        "We log the same ticket ops sees (hashed landmark, not live GPS).",
        "Then open WhatsApp with the ready text, or copy it to a leader.",
    ]


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


@router.get("/whatsapp/guide", response_model=WhatsAppGuide)
def whatsapp_guide() -> WhatsAppGuide:
    number = _channel_number()
    configured = bool(number or settings.whatsapp_phone_id)
    return WhatsAppGuide(
        configured=configured,
        number=number,
        steps=_guide_steps(),
        templates={
            "sos": "SOS {kind} at {landmark}. Medical: {medical}. Ticket {id}.",
            "hazard": "HAZARD {kind} at {landmark}. Treat the path as unsafe.",
            "route": "Need evacuation route from {landmark} to high ground.",
        },
    )


def _handle_message(
    service: IncidentService,
    routing: RoutingService,
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
        hazard_kind = kind if kind in HAZARD_KINDS else "blocked_drainage"
        event = service.add_hazard(
            kind=hazard_kind,
            from_landmark=from_landmark,
            to_landmark=to_landmark,
            source="whatsapp",
            note=text[:240],
        )
        return {"ok": True, "channel": "whatsapp", "type": "hazard", "id": event.id}
    if action == "route":
        from_landmark = landmark or "laini-saba"
        try:
            result = routing.route(from_landmark)
            return {
                "ok": True,
                "channel": "whatsapp",
                "type": "route",
                "from_landmark": result.from_landmark,
                "ussd_text": result.ussd_text,
            }
        except (ValueError, KeyError) as exc:
            return {"ok": False, "channel": "whatsapp", "type": "route", "error": str(exc)}
    sos_kind = kind if kind in SOS_KINDS else "flood_trapped"
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
    routing: RoutingService = Depends(get_routing_service),
) -> dict:
    payload = await request.json()
    if payload.get("object") == "whatsapp_business_account" or "entry" in payload:
        results = []
        for sender, text, lat, lon in extract_cloud_messages(payload):
            if sender:
                results.append(_handle_message(service, routing, sender, text, lat, lon))
        return {"ok": True, "handled": len(results), "results": results}

    sender = payload.get("from") or payload.get("sender") or ""
    if not sender:
        raise HTTPException(status_code=400, detail="WhatsApp sender is required")
    return _handle_message(
        service,
        routing,
        sender,
        payload.get("text") or "SOS",
        payload.get("lat"),
        payload.get("lon"),
    )


@router.post("/whatsapp/dispatch", response_model=WhatsAppDispatchOut)
def whatsapp_dispatch(
    body: WhatsAppDispatchIn,
    service: IncidentService = Depends(get_incident_service),
    routing: RoutingService = Depends(get_routing_service),
) -> WhatsAppDispatchOut:
    landmark = body.landmark_id or "laini-saba"
    phone = normalize_phone(body.phone) if body.phone else None
    number = _channel_number()

    if body.action == "route":
        try:
            result = routing.route(landmark, body.to_landmark)
            message = f"Need evacuation route from {landmark}. {result.ussd_text}"
            return WhatsAppDispatchOut(
                type="route",
                message=message,
                wa_url=_wa_url(message),
                number=number,
                route_text=result.ussd_text,
                steps=[
                    "We computed a dry-path route from your landmark.",
                    "Open WhatsApp (or copy) and send this text to a leader.",
                    "If a stretch is blocked, report it so routes update.",
                ],
            )
        except (ValueError, KeyError) as exc:
            message = f"Need evacuation route from {landmark} to high ground."
            return WhatsAppDispatchOut(
                type="route",
                message=message,
                wa_url=_wa_url(message),
                number=number,
                steps=[
                    str(exc),
                    "Send this WhatsApp anyway so a leader can shout a path.",
                    "Or dial *384*55# option 2.",
                ],
            )

    if body.action == "hazard":
        kind = body.kind if body.kind in HAZARD_KINDS else "blocked_drainage"
        to_landmark = body.to_landmark or ("main-drain-alley" if landmark != "main-drain-alley" else "silanga")
        event = service.add_hazard(
            kind=kind,
            from_landmark=landmark,
            to_landmark=to_landmark,
            source="whatsapp",
            note=body.note,
        )
        message = f"HAZARD {kind} at {landmark}. Treat the path as unsafe. Report {event.id[:8]}."
        return WhatsAppDispatchOut(
            type="hazard",
            id=event.id,
            message=message,
            wa_url=_wa_url(message),
            number=number,
            steps=[
                "This hazard is logged — routes will avoid the stretch.",
                "Open WhatsApp so neighbours hear it too.",
                "Then get a new text route.",
            ],
        )

    if body.ticket_id:
        event = service.get_sos(body.ticket_id)
        if not event:
            raise HTTPException(status_code=404, detail="Ticket not found")
        ticket = public_ticket(event)
        medical = "yes" if ticket.needs_medical else "no"
        message = (
            f"SOS {ticket.kind} at {ticket.landmark_id or landmark}. "
            f"Medical: {medical}. Ticket {ticket.id}."
        )
        return WhatsAppDispatchOut(
            type="sos",
            id=ticket.id,
            status=ticket.status,
            message=message,
            wa_url=_wa_url(message),
            number=number,
            steps=ticket.next_steps,
        )

    kind = body.kind if body.kind in SOS_KINDS else "flood_trapped"
    event = service.add_sos(
        kind=kind,
        landmark_id=landmark,
        phone=phone,
        source="whatsapp",
        note=body.note,
        needs_medical=body.needs_medical or kind == "medical",
    )
    medical = "yes" if event.needs_medical else "no"
    message = f"SOS {event.kind} at {event.landmark_id or landmark}. Medical: {medical}. Ticket {event.id}."
    return WhatsAppDispatchOut(
        type="sos",
        id=event.id,
        status=event.status,
        message=message,
        wa_url=_wa_url(message),
        number=number,
        steps=public_ticket(event).next_steps,
    )
