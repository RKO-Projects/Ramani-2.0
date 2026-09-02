import json
from typing import Any

from app.config import settings


class RedisClient:
    def __init__(self) -> None:
        self._client: Any = None
        if settings.redis_enabled:
            import redis

            self._client = redis.from_url(settings.redis_url, decode_responses=True)
        else:
            try:
                import fakeredis

                self._client = fakeredis.FakeRedis(decode_responses=True)
            except ImportError:
                self._client = {}

    def get(self, key: str) -> dict | None:
        if isinstance(self._client, dict):
            raw = self._client.get(key)
        else:
            raw = self._client.get(key)
        if not raw:
            return None
        return json.loads(raw)

    def setex(self, key: str, ttl_seconds: int, value: dict) -> None:
        """Set key with TTL. Uses redis set(ex=) to avoid setex deprecation warning."""
        payload = json.dumps(value)
        if isinstance(self._client, dict):
            self._client[key] = payload
            return
        self._client.set(key, payload, ex=ttl_seconds)

    def delete(self, key: str) -> None:
        if isinstance(self._client, dict):
            self._client.pop(key, None)
            return
        self._client.delete(key)


redis_client = RedisClient()
USSD_SESSION_TTL = 300
