-- ============================================================
-- Korva Phase 3: Schema Migration
-- Polish, Connectors & Advanced Analytics
-- ============================================================

-- ─── AI Conversations ────────────────────────────────────────

CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New conversation',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id, updated_at DESC);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON ai_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON ai_conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on ai_conversations"
  ON ai_conversations FOR ALL
  USING (auth.role() = 'service_role');

-- ─── AI Conversation Messages ────────────────────────────────

CREATE TABLE ai_conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  generated_sql TEXT,
  chart_type TEXT,
  chart_config JSONB,
  data JSONB,
  tokens_used INTEGER DEFAULT 0,
  execution_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_conversation_messages_convo ON ai_conversation_messages(conversation_id, created_at ASC);

ALTER TABLE ai_conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversation messages"
  ON ai_conversation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_conversation_messages.conversation_id
        AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own conversation messages"
  ON ai_conversation_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_conversation_messages.conversation_id
        AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on ai_conversation_messages"
  ON ai_conversation_messages FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Saved Queries ───────────────────────────────────────────

CREATE TABLE saved_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  question TEXT NOT NULL,
  generated_sql TEXT,
  chart_type TEXT,
  chart_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_queries_user ON saved_queries(user_id, updated_at DESC);

ALTER TABLE saved_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved queries"
  ON saved_queries FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on saved_queries"
  ON saved_queries FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Cohort Snapshots ────────────────────────────────────────

CREATE TABLE cohort_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  cohort_month DATE NOT NULL,
  months_after INTEGER NOT NULL,
  customer_count INTEGER NOT NULL DEFAULT 0,
  repeat_count INTEGER NOT NULL DEFAULT 0,
  revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, cohort_month, months_after)
);

CREATE INDEX idx_cohort_snapshots_store ON cohort_snapshots(store_id, cohort_month);

ALTER TABLE cohort_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own store cohorts"
  ON cohort_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = cohort_snapshots.store_id
        AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on cohort_snapshots"
  ON cohort_snapshots FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Integration Connections ─────────────────────────────────

CREATE TABLE integration_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('klaviyo', 'ga4', 'slack', 'tiktok_ads')),
  account_id TEXT,
  account_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, platform, account_id)
);

CREATE INDEX idx_integration_connections_store ON integration_connections(store_id, platform);

ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integration connections"
  ON integration_connections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = integration_connections.store_id
        AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own integration connections"
  ON integration_connections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = integration_connections.store_id
        AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on integration_connections"
  ON integration_connections FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Traffic Sources ─────────────────────────────────────────

CREATE TABLE traffic_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  medium TEXT,
  campaign TEXT,
  sessions INTEGER NOT NULL DEFAULT 0,
  users INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, source, COALESCE(medium, ''), COALESCE(campaign, ''), date)
);

CREATE INDEX idx_traffic_sources_store_date ON traffic_sources(store_id, date DESC);

ALTER TABLE traffic_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own traffic sources"
  ON traffic_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = traffic_sources.store_id
        AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on traffic_sources"
  ON traffic_sources FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Rate Limit Counters ─────────────────────────────────────

CREATE TABLE rate_limit_counters (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No RLS needed — only accessed via service role RPC

-- ─── Column Additions ────────────────────────────────────────

-- Notification read tracking
ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

-- AI query conversation linking
ALTER TABLE ai_queries ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL;

-- Product inventory velocity
ALTER TABLE products ADD COLUMN IF NOT EXISTS velocity_daily DECIMAL(8,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS days_of_stock INTEGER;

-- ─── RPC Functions ───────────────────────────────────────────

-- Atomic increment for AI query usage
CREATE OR REPLACE FUNCTION increment_ai_queries(p_user_id UUID)
RETURNS void AS $$
  UPDATE subscriptions
  SET ai_queries_used = ai_queries_used + 1
  WHERE user_id = p_user_id
    AND status IN ('active', 'trialing')
    AND created_at = (
      SELECT MAX(created_at) FROM subscriptions
      WHERE user_id = p_user_id AND status IN ('active', 'trialing')
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Atomic increment for order usage
CREATE OR REPLACE FUNCTION increment_orders_used(p_user_id UUID, p_count INTEGER DEFAULT 1)
RETURNS void AS $$
  UPDATE subscriptions
  SET orders_used = orders_used + p_count
  WHERE user_id = p_user_id
    AND status IN ('active', 'trialing')
    AND created_at = (
      SELECT MAX(created_at) FROM subscriptions
      WHERE user_id = p_user_id AND status IN ('active', 'trialing')
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Database-backed rate limiter
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  SELECT count, window_start INTO v_count, v_window_start
  FROM rate_limit_counters WHERE key = p_key FOR UPDATE;

  IF NOT FOUND OR (NOW() - v_window_start) > (p_window_seconds || ' seconds')::interval THEN
    INSERT INTO rate_limit_counters (key, count, window_start)
    VALUES (p_key, 1, NOW())
    ON CONFLICT (key) DO UPDATE SET count = 1, window_start = NOW();
    RETURN TRUE;
  END IF;

  IF v_count >= p_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE rate_limit_counters SET count = count + 1 WHERE key = p_key;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
