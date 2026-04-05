-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. strategy_config (service_role only - stores all secret strategy params)
CREATE TABLE strategy_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. backtest_trades
CREATE TABLE backtest_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id TEXT UNIQUE NOT NULL,
  market_question TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('win', 'loss')),
  profit_pct NUMERIC NOT NULL,
  entry_date TIMESTAMPTZ NOT NULL,
  exit_date TIMESTAMPTZ,
  strategy TEXT DEFAULT 'bond',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. paper_trades
CREATE TABLE paper_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id TEXT NOT NULL,
  market_question TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  current_price NUMERIC,
  exit_price NUMERIC,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  outcome TEXT CHECK (outcome IN ('win', 'loss')),
  profit_pct NUMERIC,
  ai_confidence NUMERIC,
  ai_reasoning TEXT,
  ai_verified BOOLEAN DEFAULT TRUE,
  entry_date TIMESTAMPTZ DEFAULT NOW(),
  exit_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(market_id, entry_date)
);

-- 4. signals
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('bond', 'btc_lag', 'eth_lag')),
  market_question TEXT NOT NULL,
  current_price NUMERIC NOT NULL,
  confidence NUMERIC NOT NULL,
  reasoning TEXT,
  ai_verified BOOLEAN DEFAULT TRUE,
  signal_date DATE DEFAULT CURRENT_DATE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(market_id, signal_type, signal_date)
);

-- 5. subscribers
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  supabase_user_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'premium')),
  telegram_chat_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. analytics_summary
CREATE TABLE analytics_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period TEXT NOT NULL CHECK (period IN ('all_time', '30d', '7d')),
  total_trades INTEGER DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  total_profit_pct NUMERIC DEFAULT 0,
  avg_profit_pct NUMERIC DEFAULT 0,
  max_drawdown_pct NUMERIC DEFAULT 0,
  sharpe_ratio NUMERIC,
  source TEXT NOT NULL CHECK (source IN ('backtest', 'paper')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(period, source)
);

-- ==================
-- ROW LEVEL SECURITY
-- ==================

ALTER TABLE strategy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_summary ENABLE ROW LEVEL SECURITY;

-- strategy_config: service_role only
CREATE POLICY "strategy_config_service_role" ON strategy_config
  FOR ALL USING (auth.role() = 'service_role');

-- backtest_trades: service_role full access, no anon access to raw table
CREATE POLICY "backtest_trades_service_role" ON backtest_trades
  FOR ALL USING (auth.role() = 'service_role');

-- paper_trades: service_role full access, anon SELECT for Realtime subscriptions
CREATE POLICY "paper_trades_service_role" ON paper_trades
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "paper_trades_anon_select" ON paper_trades
  FOR SELECT USING (auth.role() = 'anon');

-- signals: service_role full access, no anon access to raw table
CREATE POLICY "signals_service_role" ON signals
  FOR ALL USING (auth.role() = 'service_role');

-- subscribers: service_role only
CREATE POLICY "subscribers_service_role" ON subscribers
  FOR ALL USING (auth.role() = 'service_role');

-- analytics_summary: public read, service_role write
CREATE POLICY "analytics_summary_anon_read" ON analytics_summary
  FOR SELECT USING (true);

CREATE POLICY "analytics_summary_service_role" ON analytics_summary
  FOR ALL USING (auth.role() = 'service_role');

-- ==================
-- PUBLIC VIEWS (for frontend reads via API)
-- ==================

CREATE VIEW v_backtest_trades_public AS
SELECT
  market_question, outcome, profit_pct,
  entry_date, exit_date, strategy
FROM backtest_trades
ORDER BY exit_date DESC;

CREATE VIEW v_paper_trades_public AS
SELECT
  market_question, entry_price, current_price,
  status, outcome, profit_pct, ai_confidence,
  ai_verified, entry_date, exit_date
FROM paper_trades
ORDER BY created_at DESC;

CREATE VIEW v_signals_public AS
SELECT
  signal_type, market_question, current_price,
  confidence, ai_verified, expires_at, created_at
FROM signals
ORDER BY created_at DESC;

-- Grant SELECT on views to anon
GRANT SELECT ON v_backtest_trades_public TO anon;
GRANT SELECT ON v_paper_trades_public TO anon;
GRANT SELECT ON v_signals_public TO anon;
