"""
Auto-trader bot: executes real trades on Polymarket via CLOB API.
Runs via GitHub Actions every 10 minutes.

Run: python -m backend.bot.auto_trader
"""
import sys
from datetime import datetime, timezone

from backend.services.supabase_client import get_supabase
from backend.services.polymarket_client import fetch_open_markets
from backend.services.groq_service import analyze_market
from backend.services.telegram_service import send_alert
from backend.services.encryption import decrypt
from backend.services.polymarket_trader import create_trader, place_limit_order
from backend.bot.utils import (
    safe_float, parse_outcome_prices, load_strategy_config,
    find_qualifying_markets, check_risk_limits,
)


def get_active_traders(supabase) -> list[dict]:
    """Get all users with auto-trading enabled and active wallets."""
    risk = supabase.table("risk_settings").select("*").eq(
        "auto_trade_enabled", True
    ).execute()

    traders = []
    for settings in (risk.data or []):
        user_id = settings["user_id"]
        wallet = supabase.table("user_wallets").select("*").eq(
            "user_id", user_id
        ).eq("is_active", True).single().execute()

        if wallet.data:
            sub = supabase.table("subscribers").select("email, telegram_chat_id").eq(
                "id", user_id
            ).single().execute()

            traders.append({
                "user_id": user_id,
                "email": sub.data.get("email", "") if sub.data else "",
                "telegram_chat_id": sub.data.get("telegram_chat_id") if sub.data else None,
                "wallet": wallet.data,
                "risk_settings": settings,
            })

    print(f"Found {len(traders)} active auto-traders")
    return traders


def process_trade(supabase, trader: dict, market: dict, config: dict) -> bool:
    """Process a single market for a single user. Returns True if trade was placed."""
    user_id = trader["user_id"]
    market_id = market.get("id", market.get("condition_id", ""))
    if not market_id:
        return False

    # Skip if user already has position on this market
    existing = supabase.table("positions").select("id").eq(
        "user_id", user_id
    ).eq("market_id", market_id).in_(
        "status", ["pending", "open", "filled"]
    ).execute()
    if existing.data:
        return False

    prices = parse_outcome_prices(market.get("outcomePrices", "[]"))
    max_price = max(prices) if prices else 0
    volume = safe_float(market.get("volume", 0))
    question = market.get("question", "Unknown")[:500]

    end_date = market.get("endDate") or market.get("end_date_iso", "")
    try:
        end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        days_to_close = (end_dt - datetime.now(timezone.utc)).total_seconds() / 86400
    except (TypeError, ValueError):
        days_to_close = 7

    # AI analysis
    ai_result = analyze_market(question, max_price, volume, days_to_close)
    confidence = ai_result["confidence"]
    ai_verified = ai_result["ai_verified"]

    # Check confidence threshold
    confidence_min = safe_float(config.get("ai_confidence_min", 0.85))
    if ai_verified and confidence < confidence_min:
        return False
    if not ai_verified and confidence < safe_float(config.get("rule_based_fallback_confidence", 0.60)):
        return False

    # Check risk limits
    risk = trader["risk_settings"]
    position_size = safe_float(risk.get("max_position_size", 50))
    allowed, reason = check_risk_limits(supabase, user_id, risk, position_size)
    if not allowed:
        print(f"  Risk limit: {reason}")
        return False

    # Decrypt wallet and create trader client
    wallet = trader["wallet"]
    try:
        api_key = decrypt(wallet["encrypted_api_key"])
        api_secret = decrypt(wallet["encrypted_api_secret"])
        api_passphrase = decrypt(wallet["encrypted_api_passphrase"])
        private_key = decrypt(wallet["encrypted_private_key"])
    except Exception as e:
        print(f"  Decryption failed for user {user_id}: {e}")
        return False

    client = create_trader(api_key, api_secret, api_passphrase, private_key)
    if not client:
        return False

    # Get token ID for the YES outcome
    clob_token_ids = market.get("clobTokenIds", "")
    try:
        import json
        token_ids = json.loads(clob_token_ids) if isinstance(clob_token_ids, str) else clob_token_ids
        token_id = token_ids[0] if token_ids else None
    except (ValueError, TypeError, IndexError):
        token_id = None

    if not token_id:
        print(f"  No token ID for market {market_id}")
        return False

    # Calculate size in shares
    shares = position_size / max_price if max_price > 0 else 0
    if shares <= 0:
        return False

    # Place order
    order_id = place_limit_order(client, token_id, "YES", max_price, round(shares, 2))
    if not order_id:
        print(f"  Order failed for market {market_id}")
        return False

    # Record position
    now = datetime.now(timezone.utc).isoformat()
    supabase.table("positions").insert({
        "user_id": user_id,
        "market_id": market_id,
        "market_question": question,
        "side": "YES",
        "entry_price": round(max_price, 4),
        "size": round(position_size, 2),
        "order_id": order_id,
        "status": "open",
    }).execute()

    # Record trade history
    supabase.table("trade_history").insert({
        "user_id": user_id,
        "action": "buy",
        "market_id": market_id,
        "price": round(max_price, 4),
        "size": round(position_size, 2),
        "order_id": order_id,
    }).execute()

    # Telegram alert
    chat_id = trader.get("telegram_chat_id")
    if chat_id:
        verified_tag = "AI-verified" if ai_verified else "Rule-based"
        send_alert(chat_id,
            f"🤖 *Auto-Trade Executed*\n\n"
            f"📊 {question}\n"
            f"💰 Entry: {max_price:.4f}\n"
            f"📏 Size: ${position_size:.2f}\n"
            f"🎯 Confidence: {confidence*100:.0f}% ({verified_tag})\n"
            f"🔑 Order: `{order_id}`"
        )

    print(f"  TRADED [{verified_tag}]: {question[:60]}... @ {max_price:.4f} (${position_size})")
    return True


def check_resolutions(supabase, traders: list[dict]):
    """Check if any open positions have resolved."""
    for trader in traders:
        user_id = trader["user_id"]
        open_positions = supabase.table("positions").select("*").eq(
            "user_id", user_id
        ).in_("status", ["open", "filled"]).execute()

        for pos in (open_positions.data or []):
            # Query Polymarket for market resolution
            market_id = pos["market_id"]
            from backend.services.polymarket_client import _request_with_retry
            data = _request_with_retry(
                f"https://gamma-api.polymarket.com/markets/{market_id}", {}
            )
            if not data or not data.get("resolved"):
                continue

            # Market resolved - compute PnL
            outcome = data.get("outcome", "")
            entry_price = safe_float(pos["entry_price"])
            exit_price = 1.0 if (pos["side"] == "YES" and outcome == "1") or \
                                (pos["side"] == "NO" and outcome == "0") else 0.0
            size = safe_float(pos["size"])
            pnl = (exit_price - entry_price) * (size / entry_price) if entry_price > 0 else 0

            now = datetime.now(timezone.utc).isoformat()
            supabase.table("positions").update({
                "status": "closed",
                "exit_price": exit_price,
                "pnl": round(pnl, 2),
                "closed_at": now,
            }).eq("id", pos["id"]).execute()

            supabase.table("trade_history").insert({
                "user_id": user_id,
                "position_id": pos["id"],
                "action": "sell",
                "market_id": market_id,
                "price": exit_price,
                "size": size,
                "order_id": pos.get("order_id", ""),
            }).execute()

            result_emoji = "✅" if pnl > 0 else "❌"
            chat_id = trader.get("telegram_chat_id")
            if chat_id:
                send_alert(chat_id,
                    f"{result_emoji} *Position Closed*\n\n"
                    f"📊 {pos['market_question']}\n"
                    f"💰 Entry: {entry_price:.4f} → Exit: {exit_price:.4f}\n"
                    f"📈 P&L: ${pnl:+.2f}"
                )

            print(f"  Closed position: {pos['market_question'][:50]}... PnL: ${pnl:+.2f}")


def main():
    print("=== Autopoly Auto-Trader ===")
    supabase = get_supabase()

    config = load_strategy_config(supabase)
    print(f"Config: threshold={config['bond_threshold']}, volume_min={config['volume_min']}")

    traders = get_active_traders(supabase)
    if not traders:
        print("No active auto-traders. Exiting.")
        sys.exit(0)

    print("Fetching open markets...")
    markets = fetch_open_markets()
    if not markets:
        print("No markets fetched. Exiting gracefully.")
        sys.exit(0)

    qualifying = find_qualifying_markets(markets, config)

    total_trades = 0
    for trader in traders:
        print(f"\nProcessing user: {trader['email']}")
        for market in qualifying:
            if process_trade(supabase, trader, market, config):
                total_trades += 1

    print(f"\nTotal trades executed: {total_trades}")

    print("\nChecking resolutions...")
    check_resolutions(supabase, traders)

    print("=== Auto-Trader complete ===")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    main()
