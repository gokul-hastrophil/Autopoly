"""Client for Polymarket Gamma API with retry logic."""
import time
import httpx

GAMMA_API_BASE = "https://gamma-api.polymarket.com"
MAX_RETRIES = 3
BACKOFF_SECONDS = [1, 2, 4]
REQUEST_DELAY = 0.2  # 200ms between paginated requests


def _request_with_retry(url: str, params: dict) -> dict | None:
    """Make GET request with exponential backoff retry."""
    for attempt in range(MAX_RETRIES):
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.get(url, params=params)
                resp.raise_for_status()
                return resp.json()
        except (httpx.HTTPError, httpx.TimeoutException) as e:
            if attempt < MAX_RETRIES - 1:
                wait = BACKOFF_SECONDS[attempt]
                print(f"  Retry {attempt + 1}/{MAX_RETRIES} after {wait}s: {e}")
                time.sleep(wait)
            else:
                print(f"  Failed after {MAX_RETRIES} retries: {e}")
                return None


def fetch_closed_markets(limit: int = 100, max_pages: int = 10) -> list[dict]:
    """Fetch closed/resolved markets from Polymarket."""
    all_markets = []
    offset = 0
    for _ in range(max_pages):
        data = _request_with_retry(
            f"{GAMMA_API_BASE}/markets",
            params={"closed": "true", "limit": limit, "offset": offset},
        )
        if not data or len(data) == 0:
            break
        all_markets.extend(data)
        offset += limit
        time.sleep(REQUEST_DELAY)
    print(f"Fetched {len(all_markets)} closed markets")
    return all_markets


def fetch_open_markets(limit: int = 100, max_pages: int = 5) -> list[dict]:
    """Fetch active open markets from Polymarket."""
    all_markets = []
    offset = 0
    for _ in range(max_pages):
        data = _request_with_retry(
            f"{GAMMA_API_BASE}/markets",
            params={"active": "true", "closed": "false", "limit": limit, "offset": offset},
        )
        if not data or len(data) == 0:
            break
        all_markets.extend(data)
        offset += limit
        time.sleep(REQUEST_DELAY)
    print(f"Fetched {len(all_markets)} open markets")
    return all_markets
