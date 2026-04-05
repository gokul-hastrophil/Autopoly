-- Auto-Trader Module: wallets, positions, trade history, risk settings

-- 1. user_wallets: encrypted CLOB API credentials
CREATE TABLE user_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  encrypted_api_key TEXT NOT NULL,
  encrypted_api_secret TEXT NOT NULL,
  encrypted_api_passphrase TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. risk_settings: per-user risk controls
CREATE TABLE risk_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  max_position_size NUMERIC DEFAULT 50,
  max_open_positions INTEGER DEFAULT 5,
  max_daily_loss NUMERIC DEFAULT 100,
  auto_trade_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. positions: real open/closed positions
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  market_id TEXT NOT NULL,
  market_question TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('YES', 'NO')),
  entry_price NUMERIC NOT NULL,
  size NUMERIC NOT NULL,
  order_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'filled', 'closed', 'cancelled')),
  exit_price NUMERIC,
  pnl NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- 4. trade_history: immutable audit log
CREATE TABLE trade_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell', 'cancel')),
  market_id TEXT NOT NULL,
  price NUMERIC NOT NULL,
  size NUMERIC NOT NULL,
  order_id TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_positions_user_status ON positions(user_id, status);
CREATE INDEX idx_positions_market ON positions(market_id, status);
CREATE INDEX idx_trade_history_user ON trade_history(user_id, executed_at DESC);
CREATE INDEX idx_risk_settings_auto ON risk_settings(auto_trade_enabled) WHERE auto_trade_enabled = TRUE;

-- RLS: service_role only
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_wallets_service_role" ON user_wallets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "risk_settings_service_role" ON risk_settings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "positions_service_role" ON positions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "trade_history_service_role" ON trade_history FOR ALL USING (auth.role() = 'service_role');
