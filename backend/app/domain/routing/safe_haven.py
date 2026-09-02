from app.domain.routing.graph import build_adjacency, dijkstra


def nearest_safe_haven(
    origin: str,
    edges: list[dict],
    landmarks: list[dict],
    penalties: dict[tuple[str, str], float],
) -> tuple[str, float]:
    havens = [item["id"] for item in landmarks if item.get("safe_haven")]
    graph = build_adjacency(edges, penalties)
    best_haven = "community-center"
    best_cost = float("inf")
    for haven in havens:
        path, cost = dijkstra(graph, origin, haven)
        if not path:
            continue
        if cost < best_cost:
            best_cost = cost
            best_haven = haven
    return best_haven, best_cost
