"""
Strategy configuration seed script.
Copy to seed_strategy_config.py, customize values, then run:
  python seed_strategy_config.py

WARNING: seed_strategy_config.py is gitignored. Never commit actual strategy values.
"""
import os
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

STRATEGY_CONFIG = [
    {"key": "bond_threshold", "value": 0.93, "description": "Minimum outcome price to enter bond strategy"},
    {"key": "volume_min", "value": 5000, "description": "Minimum market volume in USDC"},
    {"key": "close_window_days", "value": 7, "description": "Max days until market closes"},
    {"key": "lag_threshold_pct", "value": 0.02, "description": "Min price discrepancy for lag detection"},
    {"key": "ai_confidence_min", "value": 0.85, "description": "Min AI confidence to create signal"},
    {"key": "rule_based_fallback_confidence", "value": 0.60, "description": "Fixed confidence for rule-based signals"},
    {"key": "groq_prompt_template", "value": "You are a prediction market analyst...", "description": "System prompt for Groq AI verification"},
    {"key": "groq_primary_model", "value": "llama-3.3-70b-versatile", "description": "Primary Groq model"},
    {"key": "groq_fallback_model", "value": "llama-3.1-8b-instant", "description": "Fallback Groq model"},
]

for config in STRATEGY_CONFIG:
    supabase.table("strategy_config").upsert(
        {"key": config["key"], "value": config["value"], "description": config["description"]},
        on_conflict="key"
    ).execute()
    print(f"  Seeded: {config['key']}")

print("Strategy config seeded successfully.")
