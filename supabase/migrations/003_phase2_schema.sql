-- ============================================================
-- Phase 2: Team, Reports, Notifications, API, Ads, Anomalies
-- ============================================================

-- TEAM MEMBERS
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'removed')),
  invite_token TEXT UNIQUE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, email)
);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_member ON team_members(member_id);
CREATE INDEX idx_team_members_token ON team_members(invite_token) WHERE invite_token IS NOT NULL;

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can manage team" ON team_members
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Members can view team" ON team_members
  FOR SELECT USING (auth.uid() = member_id AND status = 'accepted');
CREATE POLICY "Service role bypass team" ON team_members
  FOR ALL USING (auth.role() = 'service_role');


-- REPORTS
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('weekly_performance', 'monthly_deep_dive', 'product_performance', 'customer_insights')),
  title TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  html_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reports_store ON reports(store_id, created_at DESC);
CREATE INDEX idx_reports_user ON reports(user_id, created_at DESC);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role bypass reports" ON reports
  FOR ALL USING (auth.role() = 'service_role');


-- REPORT SCHEDULES
CREATE TABLE report_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('weekly_performance', 'monthly_deep_dive', 'product_performance', 'customer_insights')),
  schedule TEXT NOT NULL CHECK (schedule IN ('daily', 'weekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 28),
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_report_schedules_due ON report_schedules(next_send_at) WHERE enabled = true;

ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own schedules" ON report_schedules
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role bypass schedules" ON report_schedules
  FOR ALL USING (auth.role() = 'service_role');


-- NOTIFICATION PREFERENCES
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  weekly_report BOOLEAN NOT NULL DEFAULT false,
  anomaly_alerts BOOLEAN NOT NULL DEFAULT false,
  inventory_alerts BOOLEAN NOT NULL DEFAULT false,
  slack_enabled BOOLEAN NOT NULL DEFAULT false,
  slack_webhook_url TEXT,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own prefs" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role bypass prefs" ON notification_preferences
  FOR ALL USING (auth.role() = 'service_role');


-- API KEYS
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '["read"]'::jsonb,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own keys" ON api_keys
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role bypass keys" ON api_keys
  FOR ALL USING (auth.role() = 'service_role');


-- AD CONNECTIONS (OAuth tokens for Meta/Google Ads)
CREATE TABLE ad_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google')),
  account_id TEXT NOT NULL,
  account_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, platform, account_id)
);
CREATE INDEX idx_ad_connections_store ON ad_connections(store_id);

ALTER TABLE ad_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owner can manage ad connections" ON ad_connections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = ad_connections.store_id AND stores.user_id = auth.uid())
  );
CREATE POLICY "Service role bypass ad_connections" ON ad_connections
  FOR ALL USING (auth.role() = 'service_role');


-- ANOMALIES
CREATE TABLE anomalies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  expected_value DECIMAL(12,2),
  actual_value DECIMAL(12,2),
  deviation_percent DECIMAL(8,2),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  description TEXT NOT NULL,
  notified BOOLEAN NOT NULL DEFAULT false,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_anomalies_store ON anomalies(store_id, detected_at DESC);

ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owner can view anomalies" ON anomalies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = anomalies.store_id AND stores.user_id = auth.uid())
  );
CREATE POLICY "Service role bypass anomalies" ON anomalies
  FOR ALL USING (auth.role() = 'service_role');


-- NOTIFICATION LOG
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'slack')),
  type TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notification_log_user ON notification_log(user_id, sent_at DESC);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON notification_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role bypass notification_log" ON notification_log
  FOR ALL USING (auth.role() = 'service_role');


-- Apply updated_at triggers to new tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON report_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ad_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
