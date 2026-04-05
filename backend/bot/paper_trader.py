"""
Paper trading bot: fetches open markets, applies AI verification,
creates paper trades and signals, sends Telegram alerts.

Run: python -m backend.bot.paper_trader
"""
import sys
from datetime import datetime, timezone

from backend.services.supabase_client import get_supabase
from backend.services.polymarket_client import fetch_open_markets
from backend.services.groq_service import analyze_market
from backend.services.telegram_service import broadcast_signal
from backend.bot.utils import safe_float, is_within_days, parse_outcome_prices


def load_config(supabase) -> dict:
    """Load strategy config from DB."""
    result = supabase.table("strategy_config").select("key, value").execute()
    config = {row["key"]: row["value"] for row in (result.data or [])}
    required = ["bond_threshold", "volume_min", "close_window_days", "ai_confidence_min"]
    missing = [k for k in required if k not in config]
    if missing:
        print(f"ERROR: Missing strategy_config keys: {missing}")
        sys.exit(1)
    return config


def find_qualifying_markets(markets: list[dict], config: dict) -> list[dict]:
    """Filter markets matching bond strategy criteria."""
    threshold = safe_float(config["bond_threshold"], 0.93)
    volume_min = safe_float(config["volume_min"], 5000)
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


def process_market(supabase, market: dict, config: dict) -> bool:
    """Process a single market: AI verify, create trade + signal, alert."""
    market_id = market.get("id", market.get("condition_id", ""))
    if not market_id:
        return False

    # Existence check: skip if already have an open trade for this market
    existing = supabase.table("paper_trades").select("id").eq(
        "market_id", market_id
    ).eq("status", "open").execute()

    if existing.data:
        return False  # Already tracking

    prices = parse_outcome_prices(market.get("outcomePrices", "[]"))
    max_price = max(prices) if prices else 0
    volume = safe_float(market.get("volume", 0))

    end_date = market.get("endDate") or market.get("end_date_iso", "")
    try:
        end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        days_to_close = (end_dt - datetime.now(timezone.utc)).total_seconds() / 86400
    except (TypeError, ValueError):
        days_to_close = 7

    question = market.get("question", "Unknown")[:500]

    # AI analysis (3-tier waterfall)
    ai_result = analyze_market(question, max_price, volume, days_to_close)
    confidence = ai_result["confidence"]
    ai_verified = ai_result["ai_verified"]

    # Check confidence threshold (always create for rule-based fallback, but check for AI)
    confidence_min = safe_float(config.get("ai_confidence_min", 0.85))
    if ai_verified and confidence < confidence_min:
        print(f"  Skipping {question[:50]}... (confidence {confidence:.2f} < {confidence_min})")
        return False

    # Create paper trade
    now = datetime.now(timezone.utc).isoformat()
    supabase.table("paper_trades").insert({
        "market_id": market_id,
        "market_question": question,
        "entry_price": round(max_price, 4),
        "current_price": round(max_price, 4),
        "status": "open",
        "ai_confidence": round(confidence, 4),
        "ai_reasoning": ai_result["reasoning"][:500],
        "ai_verified": ai_verified,
        "entry_date": now,
    }).execute()

    # Create signal
    supabase.table("signals").upsert({
        "market_id": market_id,
        "signal_type": "bond",
        "market_question": question,
        "current_price": round(max_price, 4),
        "confidence": round(confidence, 4),
        "reasoning": ai_result["reasoning"][:500],
        "ai_verified": ai_verified,
        "expires_at": end_date,
    }, on_conflict="market_id,signal_type,signal_date").execute()

    # Telegram alerts
    subscribers = supabase.table("subscribers").select("telegram_chat_id").not_.is_(
        "telegram_chat_id", "null"
    ).eq("is_active", True).execute()

    if subscribers.data:
        sent = broadcast_signal(
            subscribers.data, question, confidence,
            ai_result["reasoning"], max_price, ai_verified
        )
        print(f"  Sent {sent} Telegram alerts")

    status_tag = "AI-verified" if ai_verified else "Rule-based"
    print(f"  Created trade [{status_tag}]: {question[:60]}... @ {max_price:.4f} (conf: {confidence:.2f})")
    return True


def close_expired_trades(supabase):
    """Close paper trades for markets that have ended."""
    open_trades = supabase.table("paper_trades").select("*").eq("status", "open").execute()
    closed = 0
    for trade in (open_trades.data or []):
        # Check if we can determine outcome (simplified)
        # In production, would fetch market resolution from Polymarket
        pass  # Will be enhanced when we have resolution data
    if closed:
        print(f"Closed {closed} expired trades")


def update_analytics(supabase):
    """Update paper trading analytics summary."""
    from backend.bot.utils import safe_float

    for period_name, days in [("all_time", 99999), ("30d", 30), ("7d", 7)]:
        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        result = supabase.table("paper_trades").select("*").eq(
            "status", "closed"
        ).gte("exit_date", cutoff).execute()
        trades = result.data or []

        if not trades:
            continue

        total = len(trades)
        wins = sum(1 for t in trades if t.get("outcome") == "win")
        win_rate = (wins / total * 100) if total > 0 else 0
        profits = [safe_float(t.get("profit_pct", 0)) for t in trades]

        supabase.table("analytics_summary").upsert({
            "period": period_name,
            "source": "paper",
            "total_trades": total,
            "win_rate": round(win_rate, 2),
            "total_profit_pct": round(sum(profits), 2),
            "avg_profit_pct": round(sum(profits) / total, 2) if total else 0,
        }, on_conflict="period,source").execute()


def main():
    print("=== Autopoly Paper Trader ===")
    supabase = get_supabase()

    config = load_config(supabase)
    print(f"Config: threshold={config['bond_threshold']}, volume_min={config['volume_min']}")

    print("Fetching open markets...")
    markets = fetch_open_markets()
    if not markets:
        print("No markets fetched. Exiting gracefully.")
        sys.exit(0)

    qualifying = find_qualifying_markets(markets, config)

    created = 0
    for market in qualifying:
        if process_market(supabase, market, config):
            created += 1

    print(f"Created {created} new paper trades")

    close_expired_trades(supabase)
    update_analytics(supabase)

    print("=== Paper Trader complete ===")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    main()
