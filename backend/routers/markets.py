"""Live market browsing and paper trade execution endpoints."""
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Request, Query
from backend.services.polymarket_client import fetch_open_markets
from backend.services.supabase_client import get_supabase
from backend.services.cache import cache_get, cache_set
from backend.services.rate_limiter import limiter
from backend.bot.utils import safe_float, parse_outcome_prices

router = APIRouter()


@router.get("/markets")
@limiter.limit("20/minute")
def get_live_markets(request: Request, category: str = "all", sort: str = "volume", limit: int = 50):
    """Fetch live markets from Polymarket with caching."""
    cache_key = f"v1:markets:{category}:{sort}:{limit}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    raw_markets = fetch_open_markets(limit=100, max_pages=2)

    markets = []
    for m in raw_markets:
        question = m.get("question", "")
        if not question:
            continue

        prices = parse_outcome_prices(m.get("outcomePrices", "[]"))
        yes_price = prices[0] if prices else 0.5
        no_price = prices[1] if len(prices) > 1 else (1 - yes_price)
        volume = safe_float(m.get("volume", 0))

        # Parse tags/category
        tags = m.get("tags", [])
        if isinstance(tags, str):
            try:
                tags = json.loads(tags)
            except (json.JSONDecodeError, TypeError):
                tags = []

        end_date = m.get("endDate") or m.get("end_date_iso", "")

        # Determine category from tags
        market_category = "other"
        tag_lower = " ".join(str(t).lower() for t in tags) if tags else ""
        question_lower = question.lower()
        if any(kw in question_lower or kw in tag_lower for kw in ["bitcoin", "btc", "ethereum", "eth", "crypto", "solana"]):
            market_category = "crypto"
        elif any(kw in question_lower or kw in tag_lower for kw in ["trump", "biden", "election", "president", "congress", "senate", "democrat", "republican"]):
            market_category = "politics"
        elif any(kw in question_lower or kw in tag_lower for kw in ["nba", "nfl", "soccer", "football", "tennis", "sports"]):
            market_category = "sports"
        elif any(kw in question_lower or kw in tag_lower for kw in ["ai", "tech", "apple", "google", "meta", "openai"]):
            market_category = "tech"

        if category != "all" and market_category != category:
            continue

        market_id = m.get("id") or m.get("condition_id", "")
        clob_token_ids = m.get("clobTokenIds", "[]")
        try:
            token_ids = json.loads(clob_token_ids) if isinstance(clob_token_ids, str) else (clob_token_ids or [])
        except (json.JSONDecodeError, TypeError):
            token_ids = []

        markets.append({
            "id": market_id,
            "question": question[:200],
            "yes_price": round(yes_price, 4),
            "no_price": round(no_price, 4),
            "volume": round(volume, 0),
            "end_date": end_date,
            "category": market_category,
            "token_ids": token_ids,
            "image": m.get("image", ""),
            "slug": m.get("slug", ""),
        })

    # Sort
    if sort == "volume":
        markets.sort(key=lambda x: x["volume"], reverse=True)
    elif sort == "newest":
        markets.sort(key=lambda x: x.get("end_date", ""), reverse=True)
    elif sort == "closing_soon":
        markets.sort(key=lambda x: x.get("end_date", "9999"))
    elif sort == "probability":
        markets.sort(key=lambda x: max(x["yes_price"], x["no_price"]), reverse=True)

    markets = markets[:limit]

    response = {"markets": markets, "count": len(markets)}
    cache_set(cache_key, response, 120)  # Cache for 2 min
    return response


@router.get("/markets/{market_id}")
@limiter.limit("30/minute")
def get_market_detail(request: Request, market_id: str):
    """Get details for a specific market."""
    from backend.services.polymarket_client import _request_with_retry

    data = _request_with_retry(f"https://gamma-api.polymarket.com/markets/{market_id}", {})
    if not data:
        return {"error": "Market not found"}

    prices = parse_outcome_prices(data.get("outcomePrices", "[]"))

    return {
        "id": data.get("id", market_id),
        "question": data.get("question", ""),
        "description": data.get("description", ""),
        "yes_price": round(prices[0], 4) if prices else 0.5,
        "no_price": round(prices[1], 4) if len(prices) > 1 else 0.5,
        "volume": safe_float(data.get("volume", 0)),
        "end_date": data.get("endDate", ""),
        "resolved": data.get("resolved", False),
        "outcome": data.get("outcome", ""),
        "image": data.get("image", ""),
        "slug": data.get("slug", ""),
    }


@router.post("/paper/trade")
@limiter.limit("10/minute")
def execute_paper_trade(request: Request, market_id: str = Query(...), side: str = Query(...), amount: float = Query(...)):
    """Execute a simulated paper trade."""
    if side not in ("YES", "NO"):
        return {"error": "Side must be YES or NO"}
    if amount <= 0 or amount > 1000:
        return {"error": "Amount must be between 0 and 1000"}

    # Fetch current market data
    from backend.services.polymarket_client import _request_with_retry
    data = _request_with_retry(f"https://gamma-api.polymarket.com/markets/{market_id}", {})
    if not data:
        return {"error": "Market not found"}

    prices = parse_outcome_prices(data.get("outcomePrices", "[]"))
    if not prices:
        return {"error": "Cannot parse market prices"}

    entry_price = prices[0] if side == "YES" else (prices[1] if len(prices) > 1 else 1 - prices[0])
    question = data.get("question", "Unknown")[:500]

    supabase = get_supabase()
    now = datetime.now(timezone.utc).isoformat()

    # Check if already have open paper trade on this market
    existing = supabase.table("paper_trades").select("id").eq(
        "market_id", market_id
    ).eq("status", "open").execute()
    if existing.data:
        return {"error": "Already have an open paper trade on this market"}

    # Create paper trade
    result = supabase.table("paper_trades").insert({
        "market_id": market_id,
        "market_question": question,
        "entry_price": round(entry_price, 4),
        "current_price": round(entry_price, 4),
        "status": "open",
        "ai_confidence": round(entry_price, 4),  # Use price as proxy confidence
        "ai_reasoning": f"Manual paper trade: {side} at {entry_price:.4f} for ${amount:.2f}",
        "ai_verified": True,
        "entry_date": now,
    }).execute()

    trade = result.data[0] if result.data else {}

    return {
        "status": "executed",
        "trade": {
            "id": trade.get("id"),
            "market": question,
            "side": side,
            "entry_price": round(entry_price, 4),
            "amount": amount,
            "created_at": now,
        }
    }
