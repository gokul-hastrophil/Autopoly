"""Shared utilities for bot scripts."""
from datetime import datetime, timezone, timedelta


def safe_float(value, default=0.0) -> float:
    """Parse a value to float safely."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def is_within_days(date_str: str, days: int) -> bool:
    """Check if an ISO date string is within N days from now."""
    try:
        if isinstance(date_str, str):
            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        else:
            dt = date_str
        now = datetime.now(timezone.utc)
        return now < dt <= now + timedelta(days=days)
    except (TypeError, ValueError):
        return False


def chunk_list(lst: list, size: int) -> list[list]:
    """Split a list into chunks of given size."""
    return [lst[i:i + size] for i in range(0, len(lst), size)]


def parse_outcome_prices(outcome_prices_str: str) -> list[float]:
    """Parse Polymarket outcomePrices JSON string to list of floats."""
    import json
    try:
        prices = json.loads(outcome_prices_str)
        return [safe_float(p) for p in prices]
    except (json.JSONDecodeError, TypeError):
        return []
