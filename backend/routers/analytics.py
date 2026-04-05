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
