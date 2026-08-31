import json
from collections import defaultdict
from functools import lru_cache
from heapq import heappop, heappush
from pathlib import Path

from app.schemas import Landmark, RouteResponse

LANDMARKS = Path(__file__).resolve().parent.parent / "data" / "kibera_landmarks.json"
GRAPH = Path(__file__).resolve().parent.parent / "data" / "kibera_graph.json"

# Live multipliers from hazard reports. >1 means avoid.
edge_penalties: dict[tuple[str, str], float] = {}

DISCLAIMER = (
    "Guidance only. Conditions change. Prefer higher ground. "
    "If water is moving, do not enter the alley."
)


@lru_cache
def landmarks() -> list[Landmark]:
    rows = json.loads(LANDMARKS.read_text(encoding="utf-8"))
    return [Landmark(**row) for row in rows]


@lru_cache
def landmark_map() -> dict[str, Landmark]:
    return {item.id: item for item in landmarks()}


@lru_cache
def _base_edges() -> list[dict]:
    return json.loads(GRAPH.read_text(encoding="utf-8"))["edges"]


def _key(a: str, b: str) -> tuple[str, str]:
    return (a, b) if a < b else (b, a)


def apply_hazard(from_landmark: str, to_landmark: str, kind: str) -> None:
    bump = 8.0 if kind == "rising_water" else 5.0
    key = _key(from_landmark, to_landmark)
    edge_penalties[key] = edge_penalties.get(key, 1.0) * bump


def _adjacency() -> dict[str, list[tuple[str, float, bool]]]:
    graph: dict[str, list[tuple[str, float, bool]]] = defaultdict(list)
    for edge in _base_edges():
        penalty = edge_penalties.get(_key(edge["from"], edge["to"]), 1.0)
        weight = edge["weight"] * penalty
        if edge.get("flood_prone") and penalty > 1:
            weight *= 1.5
        graph[edge["from"]].append((edge["to"], weight, edge["flood_prone"]))
        graph[edge["to"]].append((edge["from"], weight, edge["flood_prone"]))
    return graph


def _dijkstra(source: str, target: str) -> list[str]:
    graph = _adjacency()
    dist = {source: 0.0}
    prev: dict[str, str] = {}
    heap: list[tuple[float, str]] = [(0.0, source)]
    seen: set[str] = set()

    while heap:
        cost, node = heappop(heap)
        if node in seen:
            continue
        seen.add(node)
        if node == target:
            break
        for nxt, weight, _flood in graph.get(node, []):
            candidate = cost + weight
            if candidate < dist.get(nxt, float("inf")):
                dist[nxt] = candidate
                prev[nxt] = node
                heappush(heap, (candidate, nxt))

    if target not in prev and source != target:
        return []
    path = [target]
    while path[-1] != source:
        path.append(prev[path[-1]])
    path.reverse()
    return path


def nearest_safe_haven(origin: str) -> str:
    havens = [item.id for item in landmarks() if item.safe_haven]
    best: tuple[float, str] | None = None
    for haven in havens:
        path = _dijkstra(origin, haven)
        if not path:
            continue
        score = float(len(path))
        if best is None or score < best[0]:
            best = (score, haven)
    return best[1] if best else "community-center"


def _ussd_text(names: list[str], avoided: list[str], destination: str) -> str:
    via = " > ".join(names)
    avoid = f" Avoid {', '.join(avoided)}." if avoided else ""
    return f"EVACUATE NOW: {via}. Safe haven: {destination}.{avoid}"


def route(from_landmark: str, to_landmark: str | None = None) -> RouteResponse:
    places = landmark_map()
    if from_landmark not in places:
        raise KeyError(from_landmark)
    dest = to_landmark or nearest_safe_haven(from_landmark)
    if dest not in places:
        raise KeyError(dest)

    path = _dijkstra(from_landmark, dest)
    if not path:
        raise ValueError("No path between landmarks")

    names = [places[node].name for node in path]
    avoided = [
        places[node].name
        for node in path
        if node == "main-drain-alley" or edge_penalties.get(_key(from_landmark, node), 1) > 1
    ]
    # Prefer calling out the known flood corridor if the path skipped it.
    used = set(path)
    if "main-drain-alley" not in used:
        avoided.append(places["main-drain-alley"].name)

    dest_name = places[dest].name
    return RouteResponse(
        from_landmark=from_landmark,
        to_landmark=dest,
        path=path,
        names=names,
        ussd_text=_ussd_text(names, list(dict.fromkeys(avoided)), dest_name),
        avoided=list(dict.fromkeys(avoided)),
        disclaimer=DISCLAIMER,
    )
