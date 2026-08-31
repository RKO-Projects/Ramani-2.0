from app.services import cvi, routing, store

# In-memory sessions. Swap for Redis before a live shortcode.
_sessions: dict[str, dict] = {}

MENU = (
    "CON Ramani Safety Gateway\n"
    "1. Emergency SOS\n"
    "2. Evacuation route\n"
    "3. Report hazard\n"
    "4. Alert status"
)

SOS_MENU = (
    "CON Emergency type\n"
    "1. Flood / trapped\n"
    "2. Collapse / fire\n"
    "3. Medical"
)

ZONE_MENU = (
    "CON Your landmark\n"
    "1. Line Saba\n"
    "2. Silanga\n"
    "3. Laini Saba\n"
    "4. Olympic"
)

HAZARD_MENU = (
    "CON Report hazard\n"
    "1. Blocked drainage\n"
    "2. Rising flood water\n"
    "3. Damaged structure"
)

ZONES = {
    "1": "line-saba",
    "2": "silanga",
    "3": "laini-saba",
    "4": "olympic",
}

SOS_KINDS = {
    "1": "flood_trapped",
    "2": "collapse_fire",
    "3": "medical",
}

HAZARD_KINDS = {
    "1": "blocked_drainage",
    "2": "rising_water",
    "3": "damaged_structure",
}


def _end(text: str) -> str:
    return f"END {text}"


def handle(session_id: str, phone: str, text: str) -> str:
    parts = [chunk for chunk in text.split("*") if chunk]
    if not parts:
        _sessions[session_id] = {"phone": phone}
        return MENU

    choice = parts[0]
    if choice == "1":
        return _sos(session_id, phone, parts)
    if choice == "2":
        return _route(parts)
    if choice == "3":
        return _hazard(session_id, phone, parts)
    if choice == "4":
        alert = cvi.alert_copy()
        return _end(f"{alert['headline']}. {alert['detail']}")
    return _end("Invalid choice. Dial again.")


def _sos(session_id: str, phone: str, parts: list[str]) -> str:
    if len(parts) == 1:
        return SOS_MENU
    if len(parts) == 2:
        return ZONE_MENU
    kind = SOS_KINDS.get(parts[1])
    landmark = ZONES.get(parts[2])
    if not kind or not landmark:
        return _end("Could not read that SOS. Dial again.")
    store.add_sos(kind=kind, landmark_id=landmark, phone=phone, source="ussd")
    route = routing.route(landmark)
    return _end(
        f"SOS logged from {routing.landmark_map()[landmark].name}. "
        f"{route.ussd_text} SMS confirm follows."
    )


def _route(parts: list[str]) -> str:
    if len(parts) == 1:
        return ZONE_MENU
    landmark = ZONES.get(parts[1])
    if not landmark:
        return _end("Unknown landmark.")
    result = routing.route(landmark)
    return _end(f"{result.ussd_text} {result.disclaimer}")


def _hazard(session_id: str, phone: str, parts: list[str]) -> str:
    if len(parts) == 1:
        return HAZARD_MENU
    if len(parts) == 2:
        return ZONE_MENU
    kind = HAZARD_KINDS.get(parts[1])
    landmark = ZONES.get(parts[2])
    if not kind or not landmark:
        return _end("Could not save that report.")
    neighbor = "main-drain-alley" if landmark != "main-drain-alley" else "silanga"
    routing.apply_hazard(landmark, neighbor, kind)
    store.add_hazard(
        kind=kind,
        from_landmark=landmark,
        to_landmark=neighbor,
        source="ussd",
        note=f"ussd:{phone}",
    )
    return _end("Report received. Thank you. Teams can see this on the emergency map.")
