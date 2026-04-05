"""Analytics and proof endpoints - public, read-only."""
from fastapi import APIRouter, Request
from backend.services.supabase_client import get_supabase
from backend.services.cache import cache_get, cache_set
from backend.services.rate_limiter import limiter

router = APIRouter()

ANALYTICS_CACHE_TTL = 300  # 5 minutes
PROOF_CACHE_TTL = 120  # 2 minutes


@router.get("/analytics")
@limiter.limit("30/minute")
def get_analytics(request: Request):
    """Returns analytics_summary for all periods and sources."""
    cached = cache_get("v1:analytics")
    if cached:
        return cached

    supabase = get_supabase()
    result = supabase.table("analytics_summary").select("*").execute()

    response = {"backtest": {}, "paper": {}}
    for row in (result.data or []):
        source = row.get("source", "backtest")
        period = row.get("period", "all_time")
        if source in response:
            response[source][period] = {
                "total_trades": row.get("total_trades", 0),
                "win_rate": row.get("win_rate", 0),
                "total_profit_pct": row.get("total_profit_pct", 0),
                "avg_profit_pct": row.get("avg_profit_pct", 0),
                "max_drawdown_pct": row.get("max_drawdown_pct", 0),
                "sharpe_ratio": row.get("sharpe_ratio"),
                "updated_at": row.get("updated_at"),
            }

    cache_set("v1:analytics", response, ANALYTICS_CACHE_TTL)
    return response


@router.get("/proof")
@limiter.limit("30/minute")
def get_proof(request: Request):
    """Returns backtest trades and paper trades for the proof page charts."""
    cached = cache_get("v1:proof")
    if cached:
        return cached

    supabase = get_supabase()

    # Fetch from views (not raw tables)
    backtest = supabase.from_("v_backtest_trades_public").select("*").limit(100).execute()
    paper = supabase.from_("v_paper_trades_public").select("*").limit(50).execute()
    analytics = supabase.table("analytics_summary").select("*").execute()

    response = {
        "backtest_trades": backtest.data or [],
        "paper_trades": paper.data or [],
        "analytics": {
            row.get("source", "") + "_" + row.get("period", ""): row
            for row in (analytics.data or [])
        },
    }

    cache_set("v1:proof", response, PROOF_CACHE_TTL)
    return response


@router.get("/paper/positions")
def get_paper_positions(status: str = "all"):
    """Get paper trading positions (public - shows system-wide paper trades)."""
    cached = cache_get(f"v1:paper:positions:{status}")
    if cached:
        return cached

    supabase = get_supabase()
    query = supabase.table("paper_trades").select("*").order("created_at", desc=True)
    if status == "open":
        query = query.eq("status", "open")
    elif status == "closed":
        query = query.eq("status", "closed")
    result = query.limit(100).execute()

    response = {"positions": result.data or [], "count": len(result.data or [])}
    cache_set(f"v1:paper:positions:{status}", response, 60)
    return response


@router.get("/paper/summary")
def get_paper_summary():
    """Get paper trading P&L summary."""
    cached = cache_get("v1:paper:summary")
    if cached:
        return cached

    supabase = get_supabase()

    # Get all paper trades
    all_trades = supabase.table("paper_trades").select("*").execute()
    trades = all_trades.data or []

    open_trades = [t for t in trades if t.get("status") == "open"]
    closed_trades = [t for t in trades if t.get("status") == "closed"]

    # Calculate stats
    total_trades = len(trades)
    open_count = len(open_trades)
    closed_count = len(closed_trades)

    wins = sum(1 for t in closed_trades if t.get("outcome") == "win")
    losses = closed_count - wins
    win_rate = (wins / closed_count * 100) if closed_count > 0 else 0

    realized_pnl = sum(float(t.get("profit_pct", 0) or 0) for t in closed_trades)

    # Unrealized P&L for open trades
    unrealized_pnl = 0
    for t in open_trades:
        entry = float(t.get("entry_price", 0) or 0)
        current = float(t.get("current_price", 0) or 0)
        if entry > 0:
            unrealized_pnl += ((current - entry) / entry) * 100

    starting_balance = 10000
    current_balance = starting_balance * (1 + realized_pnl / 100)

    response = {
        "starting_balance": starting_balance,
        "current_balance": round(current_balance, 2),
        "total_pnl": round(realized_pnl, 2),
        "unrealized_pnl": round(unrealized_pnl, 2),
        "total_trades": total_trades,
        "open_positions": open_count,
        "closed_positions": closed_count,
        "wins": wins,
        "losses": losses,
        "win_rate": round(win_rate, 1),
    }
    cache_set("v1:paper:summary", response, 60)
    return response
