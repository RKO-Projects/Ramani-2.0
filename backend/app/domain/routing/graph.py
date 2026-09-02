from collections import defaultdict


def edge_key(a: str, b: str) -> tuple[str, str]:
    return (a, b) if a < b else (b, a)


def build_adjacency(
    edges: list[dict],
    penalties: dict[tuple[str, str], float],
) -> dict[str, list[tuple[str, float, bool]]]:
    graph: dict[str, list[tuple[str, float, bool]]] = defaultdict(list)
    for edge in edges:
        key = edge_key(edge["from"], edge["to"])
        penalty = penalties.get(key, 1.0)
        weight = edge["weight"] * penalty
        if edge.get("flood_prone") and penalty > 1:
            weight *= 1.5
        graph[edge["from"]].append((edge["to"], weight, edge["flood_prone"]))
        graph[edge["to"]].append((edge["from"], weight, edge["flood_prone"]))
    return graph


def dijkstra(
    graph: dict[str, list[tuple[str, float, bool]]],
    source: str,
    target: str,
) -> tuple[list[str], float]:
    from heapq import heappop, heappush

    dist: dict[str, float] = {source: 0.0}
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
        return [], float("inf")
    path = [target]
    while path[-1] != source:
        path.append(prev[path[-1]])
    path.reverse()
    return path, dist.get(target, float("inf"))
