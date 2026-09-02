DISCLAIMER = (
    "Guidance only. Conditions change. Prefer higher ground. "
    "If water is moving, do not enter the alley."
)


def ussd_text(names: list[str], avoided: list[str], destination: str) -> str:
    via = " > ".join(names)
    avoid = f" Avoid {', '.join(avoided)}." if avoided else ""
    return f"EVACUATE NOW: {via}. Safe haven: {destination}.{avoid}"


def avoided_landmarks(
    path: list[str],
    landmark_names: dict[str, str],
    penalties: dict[tuple[str, str], float],
    origin: str,
) -> list[str]:
    avoided: list[str] = []
    for node in path:
        if node == "main-drain-alley":
            avoided.append(landmark_names[node])
            continue
        for (a, b), multiplier in penalties.items():
            if multiplier <= 1:
                continue
            if node in {a, b} and origin in {a, b}:
                avoided.append(landmark_names.get(node, node))
    used = set(path)
    if "main-drain-alley" in landmark_names and "main-drain-alley" not in used:
        avoided.append(landmark_names["main-drain-alley"])
    return list(dict.fromkeys(avoided))
