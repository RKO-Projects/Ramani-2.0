#!/usr/bin/env python3
"""Simple load test for incident intake and USSD callback."""

import concurrent.futures
import os
import time

import httpx

BASE = os.getenv("RAMANI_BASE_URL", "http://localhost:8000")
REQUESTS = int(os.getenv("RAMANI_LOAD_REQUESTS", "20"))


def post_sos(client: httpx.Client, index: int) -> int:
    response = client.post(
        f"{BASE}/api/v1/sos",
        json={"kind": "flood_trapped", "landmark_id": "line-saba", "source": "pwa"},
        headers={"Idempotency-Key": f"load-{index}"},
    )
    return response.status_code


def post_ussd(client: httpx.Client, index: int) -> int:
    response = client.post(
        f"{BASE}/api/v1/ussd",
        data={"sessionId": f"load-{index}", "phoneNumber": "+254700000000", "text": "4"},
    )
    return response.status_code


def main() -> None:
    start = time.perf_counter()
    with httpx.Client(timeout=10.0) as client:
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            sos_codes = list(pool.map(lambda i: post_sos(client, i), range(REQUESTS)))
            ussd_codes = list(pool.map(lambda i: post_ussd(client, i + REQUESTS), range(REQUESTS)))
    elapsed = round(time.perf_counter() - start, 2)
    print(
        {
            "requests": REQUESTS * 2,
            "elapsed_seconds": elapsed,
            "sos_ok": sum(code == 200 for code in sos_codes),
            "ussd_ok": sum(code == 200 for code in ussd_codes),
        }
    )


if __name__ == "__main__":
    main()
