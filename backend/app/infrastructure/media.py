import base64
import json
from pathlib import Path

from fastapi import HTTPException

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
MAX_PHOTO = 50 * 1024
MAX_VOICE = 80 * 1024

HELP_POINTS_PATH = Path(__file__).resolve().parent.parent / "data" / "help_points.json"
LANDMARKS_PATH = Path(__file__).resolve().parent.parent / "data" / "kibera_landmarks.json"


def help_points() -> list[dict]:
    return json.loads(HELP_POINTS_PATH.read_text(encoding="utf-8"))


def landmark_names() -> dict[str, str]:
    rows = json.loads(LANDMARKS_PATH.read_text(encoding="utf-8"))
    return {row["id"]: row["name"] for row in rows}


def nearest_help(landmark_id: str | None) -> dict | None:
    points = help_points()
    if landmark_id:
        for row in points:
            if row["landmark_id"] == landmark_id:
                return row
    return points[0] if points else None


def decode_limited_b64(raw: str | None, *, limit: int, label: str) -> bytes | None:
    if not raw:
        return None
    payload = raw.split(",", 1)[-1]
    try:
        data = base64.b64decode(payload, validate=False)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Invalid {label}") from exc
    if len(data) > limit:
        raise HTTPException(status_code=413, detail=f"{label} must be under {limit} bytes")
    return data


def save_media(event_id: str, photo_b64: str | None, voice_b64: str | None) -> tuple[str | None, str | None]:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    photo_path = None
    voice_path = None
    photo = decode_limited_b64(photo_b64, limit=MAX_PHOTO, label="photo")
    if photo:
        dest = UPLOAD_DIR / f"{event_id}.jpg"
        dest.write_bytes(photo)
        photo_path = str(dest)
    voice = decode_limited_b64(voice_b64, limit=MAX_VOICE, label="voice note")
    if voice:
        dest = UPLOAD_DIR / f"{event_id}.webm"
        dest.write_bytes(voice)
        voice_path = str(dest)
    return photo_path, voice_path
