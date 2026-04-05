"""
Data retention cleanup: deletes old signals and closed paper trades.
Run weekly as part of backtest cron.

Run: python -m backend.bot.cleanup
"""
from datetime import datetime, timezone, timedelta
from backend.services.supabase_client import get_supabase


def main():
    print("=== Autopoly Cleanup ===")
    supabase = get_supabase()

    # Delete signals older than 30 days
    cutoff_30d = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    result = supabase.table("signals").delete().lt("created_at", cutoff_30d).execute()
    deleted_signals = len(result.data) if result.data else 0
    print(f"Deleted {deleted_signals} signals older than 30 days")

    # Delete closed paper trades older than 90 days
    cutoff_90d = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    result = supabase.table("paper_trades").delete().eq(
        "status", "closed"
    ).lt("exit_date", cutoff_90d).execute()
    deleted_trades = len(result.data) if result.data else 0
    print(f"Deleted {deleted_trades} closed paper trades older than 90 days")

    print("=== Cleanup complete ===")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    main()
