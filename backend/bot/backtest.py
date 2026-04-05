"""
Backtest bot: fetches historical Polymarket data, simulates bond strategy,
persists results, and computes analytics summaries.

Run: python -m backend.bot.backtest
"""
import sys
from datetime import datetime, timezone, timedelta

from backend.services.supabase_client import get_supabase
from backend.services.polymarket_client import fetch_closed_markets
from backend.bot.utils import safe_float, parse_outcome_prices, chunk_list


def load_strategy_config(supabase) -> dict:
    """Load strategy parameters from strategy_config table."""
    result = supabase.table("strategy_config").select("key, value").execute()
    config = {}
    for row in result.data:
        config[row["key"]] = row["value"]

    required_keys = ["bond_threshold", "volume_min", "close_window_days"]
    missing = [k for k in required_keys if k not in config]
    if missing:
        print(f"ERROR: Missing strategy_config keys: {missing}")
        print("Run seed_strategy_config.py to populate the config table.")
        sys.exit(1)

    return config


def simulate_bond_strategy(markets: list[dict], config: dict) -> list[dict]:
    """Run bond strategy simulation on closed markets."""
    bond_threshold = safe_float(config["bond_threshold"], 0.93)
    volume_min = safe_float(config["volume_min"], 5000)
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)

    trades = []
    for market in markets:
        try:
            # Parse end date
            end_date_str = market.get("endDate") or market.get("end_date_iso", "")
            if not end_date_str:
                continue
            end_date = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
            if end_date < cutoff:
                continue

            # Check volume
            volume = safe_float(market.get("volume", 0))
            if volume < volume_min:
                continue

            # Parse outcome prices
            prices = parse_outcome_prices(market.get("outcomePrices", "[]"))
            if not prices:
                continue

            # Bond strategy: find outcomes priced >= threshold
            max_price = max(prices)
            if max_price < bond_threshold:
                continue

            # Determine resolution
            resolved = market.get("resolved", False)
            if not resolved:
                continue

            # Check which outcome won
            outcome_str = market.get("outcome", "")
            # If highest-priced outcome was the correct one -> win
            entry_price = max_price

            # Polymarket: outcome "1" means first token won, "0" means second
            # If we bought the highest-priced outcome:
            won = False
            if outcome_str and prices:
                winning_index = int(outcome_str) if outcome_str.isdigit() else -1
                if winning_index >= 0 and winning_index < len(prices):
                    # We bet on the max price outcome
                    max_index = prices.index(max_price)
                    won = (max_index == winning_index)

            exit_price = 1.0 if won else 0.0
            profit_pct = ((exit_price - entry_price) / entry_price) * 100

            trades.append({
                "market_id": market.get("id", market.get("condition_id", "")),
                "market_question": market.get("question", "Unknown")[:500],
                "entry_price": round(entry_price, 4),
                "exit_price": exit_price,
                "outcome": "win" if won else "loss",
                "profit_pct": round(profit_pct, 2),
                "entry_date": end_date.isoformat(),  # approximate
                "exit_date": end_date.isoformat(),
                "strategy": "bond",
            })
        except Exception as e:
            print(f"  Skipping market: {e}")
            continue

    print(f"Generated {len(trades)} backtest trades")
    return trades


def persist_trades(supabase, trades: list[dict]) -> int:
    """Insert trades with ON CONFLICT DO NOTHING (idempotent)."""
    inserted = 0
    for batch in chunk_list(trades, 50):
        try:
            result = supabase.table("backtest_trades").upsert(
                batch, on_conflict="market_id", ignore_duplicates=True
            ).execute()
            inserted += len(result.data) if result.data else 0
        except Exception as e:
            print(f"  Batch insert error: {e}")
    print(f"Inserted {inserted} new trades (duplicates skipped)")
    return inserted


def compute_analytics(supabase):
    """Compute and upsert analytics_summary for backtest source."""
    for period, days in [("all_time", 99999), ("30d", 30), ("7d", 7)]:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        result = supabase.table("backtest_trades").select("*").gte("exit_date", cutoff).execute()
        trades = result.data or []

        if not trades:
            continue

        total = len(trades)
        wins = sum(1 for t in trades if t["outcome"] == "win")
        win_rate = (wins / total * 100) if total > 0 else 0
        profits = [safe_float(t["profit_pct"]) for t in trades]
        total_profit = sum(profits)
        avg_profit = total_profit / total if total > 0 else 0

        # Max drawdown (simple cumulative)
        cumulative = 0
        peak = 0
        max_dd = 0
        for p in profits:
            cumulative += p
            if cumulative > peak:
                peak = cumulative
            dd = peak - cumulative
            if dd > max_dd:
                max_dd = dd

        supabase.table("analytics_summary").upsert(
            {
                "period": period,
                "source": "backtest",
                "total_trades": total,
                "win_rate": round(win_rate, 2),
                "total_profit_pct": round(total_profit, 2),
                "avg_profit_pct": round(avg_profit, 2),
                "max_drawdown_pct": round(max_dd, 2),
            },
            on_conflict="period,source",
        ).execute()
        print(f"  Analytics [{period}]: {total} trades, {win_rate:.1f}% win rate, {total_profit:.1f}% total profit")


def main():
    print("=== Autopoly Backtest ===")
    supabase = get_supabase()

    # Load strategy config
    print("Loading strategy config...")
    config = load_strategy_config(supabase)
    print(f"  bond_threshold={config['bond_threshold']}, volume_min={config['volume_min']}")

    # Fetch closed markets
    print("Fetching closed markets from Polymarket...")
    markets = fetch_closed_markets()
    if not markets:
        print("No markets fetched. Exiting gracefully.")
        sys.exit(0)

    # Run strategy
    print("Running bond strategy simulation...")
    trades = simulate_bond_strategy(markets, config)

    # Persist
    if trades:
        print("Persisting trades...")
        persist_trades(supabase, trades)

    # Compute analytics
    print("Computing analytics...")
    compute_analytics(supabase)

    print("=== Backtest complete ===")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    main()
