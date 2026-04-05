"""
Signal scanner: detects BTC/ETH price lag between Binance and Polymarket.

Run: python -m backend.bot.signal_scanner
"""
import sys
import httpx
from datetime import datetime, timezone

from backend.services.supabase_client import get_supabase
from backend.services.polymarket_client import fetch_open_markets
from backend.bot.utils import safe_float


BINANCE_API = "https://api.binance.com"


def load_config(supabase) -> dict:
    """Load lag threshold from strategy_config."""
    result = supabase.table("strategy_config").select("key, value").eq(
        "key", "lag_threshold_pct"
    ).execute()
    threshold = 0.02
    if result.data:
        threshold = float(result.data[0]["value"])
    return {"lag_threshold_pct": threshold}


def fetch_binance_prices() -> dict | None:
    """Fetch BTC and ETH prices from Binance. Returns None if unreachable."""
    try:
        with httpx.Client(timeout=10) as client:
            btc = client.get(f"{BINANCE_API}/api/v3/ticker/price", params={"symbol": "BTCUSDT"})
            eth = client.get(f"{BINANCE_API}/api/v3/ticker/price", params={"symbol": "ETHUSDT"})
            return {
                "BTC": safe_float(btc.json().get("price", 0)),
                "ETH": safe_float(eth.json().get("price", 0)),
            }
    except Exception as e:
        print(f"  Binance API unreachable: {e}")
        return None


def find_crypto_markets(markets: list[dict]) -> list[dict]:
    """Find Polymarket markets related to BTC/ETH price predictions."""
    crypto_keywords = ["bitcoin", "btc", "ethereum", "eth"]
    price_keywords = ["price", "above", "below", "reach", "hit"]

    crypto_markets = []
    for m in markets:
        question = (m.get("question", "") or "").lower()
        has_crypto = any(kw in question for kw in crypto_keywords)
        has_price = any(kw in question for kw in price_keywords)
        if has_crypto and has_price:
            crypto_markets.append(m)

    return crypto_markets


def detect_lag_signals(crypto_markets: list[dict], binance_prices: dict, threshold: float) -> list[dict]:
    """Detect price lag between Binance spot and Polymarket predictions."""
    signals = []

    for m in crypto_markets:
        question = (m.get("question", "") or "").lower()
        prices = m.get("outcomePrices", "[]")
        try:
            import json
            outcome_prices = [safe_float(p) for p in json.loads(prices)]
        except Exception:
            continue

        if not outcome_prices:
            continue

        # Determine which crypto
        asset = "BTC" if any(kw in question for kw in ["bitcoin", "btc"]) else "ETH"
        spot_price = binance_prices.get(asset, 0)
        if not spot_price:
            continue

        # Try to extract target price from question
        # Simple heuristic: look for dollar amounts
        import re
        price_matches = re.findall(r'\$?([\d,]+(?:\.\d+)?)', question)
        if not price_matches:
            continue

        target_prices = [safe_float(p.replace(",", "")) for p in price_matches]
        target_prices = [p for p in target_prices if p > 100]  # Filter out non-prices

        if not target_prices:
            continue

        target = target_prices[0]
        yes_price = outcome_prices[0] if outcome_prices else 0.5

        # Implied probability from market vs what Binance price suggests
        if "above" in question or "reach" in question or "hit" in question:
            # Market is about price going above target
            actual_probability = 1.0 if spot_price > target else max(0, 1 - (target - spot_price) / target)
        elif "below" in question:
            actual_probability = 1.0 if spot_price < target else max(0, 1 - (spot_price - target) / spot_price)
        else:
            continue

        discrepancy = abs(actual_probability - yes_price)

        if discrepancy > threshold:
            market_id = m.get("id", m.get("condition_id", ""))
            signal_type = f"{asset.lower()}_lag"

            signals.append({
                "market_id": market_id,
                "signal_type": signal_type,
                "market_question": (m.get("question", "Unknown"))[:500],
                "current_price": round(yes_price, 4),
                "confidence": round(min(discrepancy * 2, 0.95), 4),  # Scale discrepancy to confidence
                "reasoning": f"{asset} spot ${spot_price:,.0f} vs market {yes_price:.2f} (target ${target:,.0f}). Discrepancy: {discrepancy:.2%}",
                "ai_verified": False,  # Lag detection is rule-based
                "expires_at": m.get("endDate"),
            })

    # Sort by confidence, take top 10
    signals.sort(key=lambda s: s["confidence"], reverse=True)
    return signals[:10]


def persist_signals(supabase, signals: list[dict]) -> int:
    """Upsert signals (safe-to-rerun: ON CONFLICT DO UPDATE)."""
    saved = 0
    for signal in signals:
        try:
            supabase.table("signals").upsert(
                signal,
                on_conflict="market_id,signal_type,(created_at::date)",
            ).execute()
            saved += 1
        except Exception as e:
            print(f"  Signal upsert error: {e}")
    return saved


def main():
    print("=== Autopoly Signal Scanner ===")
    supabase = get_supabase()

    config = load_config(supabase)
    threshold = config["lag_threshold_pct"]
    print(f"Lag threshold: {threshold*100:.1f}%")

    # Fetch Binance prices - skip lag detection if unreachable
    print("Fetching Binance prices...")
    binance_prices = fetch_binance_prices()
    if not binance_prices:
        print("Binance API unreachable. Skipping lag detection. Exiting gracefully.")
        sys.exit(0)
    print(f"  BTC: ${binance_prices['BTC']:,.0f}, ETH: ${binance_prices['ETH']:,.0f}")

    # Fetch Polymarket markets
    print("Fetching open markets...")
    markets = fetch_open_markets()
    if not markets:
        print("No markets fetched. Exiting gracefully.")
        sys.exit(0)

    # Find crypto price markets
    crypto_markets = find_crypto_markets(markets)
    print(f"Found {len(crypto_markets)} crypto price markets")

    if not crypto_markets:
        print("No crypto price markets found. Exiting.")
        sys.exit(0)

    # Detect lag
    signals = detect_lag_signals(crypto_markets, binance_prices, threshold)
    print(f"Detected {len(signals)} lag signals")

    if signals:
        saved = persist_signals(supabase, signals)
        print(f"Saved {saved} signals to database")

    print("=== Signal Scanner complete ===")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    main()
