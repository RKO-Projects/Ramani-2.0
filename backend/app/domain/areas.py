from app.config import settings
from app.domain.cvi import CviService
from app.domain.incidents import IncidentService
from app.domain.routing.service import RoutingService
from app.infrastructure.media import help_points
from app.schemas import AreaDetail, AreaEdge, AreaMap, AreaNode, HelpPointOut


def _help_for(landmark_id: str) -> list[HelpPointOut]:
    rows = [HelpPointOut(**row) for row in help_points() if row["landmark_id"] == landmark_id]
    if rows:
        return rows
    fallback = [row for row in help_points() if row["kind"] in {"relief", "haven"}][:2]
    return [HelpPointOut(**row) for row in fallback]


def build_area_map(
    routing: RoutingService,
    cvi: CviService,
    incidents: IncidentService,
) -> AreaMap:
    landmarks = {row["id"]: row for row in routing.landmarks()}
    zones = {zone.id: zone for zone in cvi.compute_cvi().zones}
    hazards, _ = incidents.list_hazards(limit=50, offset=0)
    hazard_counts: dict[str, int] = {}
    for event in hazards:
        hazard_counts[event.from_landmark] = hazard_counts.get(event.from_landmark, 0) + 1
        hazard_counts[event.to_landmark] = hazard_counts.get(event.to_landmark, 0) + 1

    neighbors: dict[str, list[str]] = {key: [] for key in landmarks}
    flood_nodes: set[str] = set()
    edges: list[AreaEdge] = []
    for edge in routing.geo.list_edges() if hasattr(routing, "geo") else []:
        a, b = edge["from"], edge["to"]
        flood = bool(edge.get("flood_prone"))
        edges.append(AreaEdge(from_id=a, to_id=b, flood_prone=flood))
        if a in neighbors:
            neighbors[a].append(b)
        if b in neighbors:
            neighbors[b].append(a)
        if flood:
            flood_nodes.add(a)
            flood_nodes.add(b)

    nodes: list[AreaNode] = []
    for item in landmarks.values():
        zone = zones.get(item["id"])
        priority = zone.priority if zone else ("low" if item.get("safe_haven") else "moderate")
        if item["id"] in flood_nodes:
            priority = "critical" if priority != "low" else "high"
        alarm = priority in {"critical", "high"} or hazard_counts.get(item["id"], 0) > 0 or item["id"] in flood_nodes
        if item.get("safe_haven"):
            alarm = hazard_counts.get(item["id"], 0) > 0
            priority = "low" if not alarm else priority
        nodes.append(
            AreaNode(
                id=item["id"],
                name=item["name"],
                lat=item["lat"],
                lon=item["lon"],
                safe_haven=bool(item.get("safe_haven")),
                priority=priority,
                alarm=alarm,
                neighbors=list(dict.fromkeys(neighbors.get(item["id"], []))),
                help=_help_for(item["id"]),
                hazard_count=hazard_counts.get(item["id"], 0),
                flood_prone=item["id"] in flood_nodes,
            )
        )
    return AreaMap(settlement_id=settings.default_settlement, nodes=nodes, edges=edges)


def build_area_detail(area_id: str, payload: AreaMap, cvi: CviService) -> AreaDetail | None:
    node = next((row for row in payload.nodes if row.id == area_id), None)
    if not node:
        return None
    zone = next((row for row in cvi.compute_cvi().zones if row.id == area_id), None)
    neighbor_names = [row.name for row in payload.nodes if row.id in node.neighbors]
    if node.safe_haven:
        blurb = f"{node.name} is high ground / a gathering point. Nearby: {', '.join(neighbor_names) or 'open paths'}."
        steps = [
            "Stay on higher ground if water is rising.",
            "Share this landmark with neighbours on WhatsApp.",
            "Report a blocked path if the way here is unsafe.",
        ]
    elif node.alarm:
        blurb = f"{node.name} is a danger zone right now. Nearby safer ground: {', '.join(neighbor_names) or 'Highridge / Community Center'}."
        steps = [
            "Do not walk flood-prone alleys if water is moving.",
            "Send SOS if you cannot leave.",
            "Get a text route to the nearest safe haven.",
        ]
    else:
        blurb = f"You are in {node.name}. Nearby: {', '.join(neighbor_names) or 'adjacent landmarks'}."
        steps = [
            "Watch local alerts.",
            "Report blocked drains before they flood.",
            "Save a dry-path route while the network is up.",
        ]
    help_line = node.help[0].hint if node.help else ""
    if help_line:
        blurb = f"{blurb} {help_line}"
    return AreaDetail(
        **node.model_dump(),
        cvi=zone.cvi if zone else None,
        blurb=blurb,
        next_steps=steps,
    )
