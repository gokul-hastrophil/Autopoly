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


def load_strategy_config(supabase) -> dict:
    """Load strategy parameters from strategy_config table."""
    import sys
    result = supabase.table("strategy_config").select("key, value").execute()
    config = {}
    for row in result.data:
        config[row["key"]] = row["value"]
    required_keys = ["bond_threshold", "volume_min", "close_window_days"]
    missing = [k for k in required_keys if k not in config]
    if missing:
        print(f"ERROR: Missing strategy_config keys: {missing}")
        sys.exit(1)
    return config


def find_qualifying_markets(markets: list[dict], config: dict) -> list[dict]:
    """Filter markets matching bond strategy criteria."""
    threshold = safe_float(config.get("bond_threshold", 0.93))
    volume_min = safe_float(config.get("volume_min", 5000))
    close_days = int(config.get("close_window_days", 7))
    qualifying = []
    for m in markets:
        prices = parse_outcome_prices(m.get("outcomePrices", "[]"))
        if not prices or max(prices) < threshold:
            continue
        volume = safe_float(m.get("volume", 0))
        if volume < volume_min:
            continue
        end_date = m.get("endDate") or m.get("end_date_iso", "")
        if not end_date or not is_within_days(end_date, close_days):
            continue
        qualifying.append(m)
    print(f"Found {len(qualifying)} qualifying markets")
    return qualifying


def check_risk_limits(supabase, user_id: str, risk_settings: dict, proposed_size: float) -> tuple[bool, str]:
    """Check if a proposed trade is within user's risk limits. Returns (allowed, reason)."""
    max_size = safe_float(risk_settings.get("max_position_size", 50))
    max_open = int(risk_settings.get("max_open_positions", 5))
    max_daily = safe_float(risk_settings.get("max_daily_loss", 100))

    if proposed_size > max_size:
        return False, f"Position size {proposed_size} exceeds max {max_size}"

    # Check open positions count
    open_positions = supabase.table("positions").select("id").eq(
        "user_id", user_id
    ).in_("status", ["pending", "open", "filled"]).execute()
    if len(open_positions.data or []) >= max_open:
        return False, f"Max open positions ({max_open}) reached"

    # Check daily loss
    from datetime import datetime, timezone, timedelta
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    daily_trades = supabase.table("positions").select("pnl").eq(
        "user_id", user_id
    ).eq("status", "closed").gte("closed_at", today_start).execute()
    daily_loss = sum(safe_float(t.get("pnl", 0)) for t in (daily_trades.data or []) if safe_float(t.get("pnl", 0)) < 0)
    if abs(daily_loss) >= max_daily:
        return False, f"Daily loss limit (${max_daily}) reached"

    return True, "OK"
