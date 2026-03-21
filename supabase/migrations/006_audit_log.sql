-- ================================================================
-- Phase 4 Batch 5: Audit Log Table
-- ================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for querying
CREATE INDEX idx_audit_log_user_created ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_store_created ON audit_log(store_id, created_at DESC);

-- RLS policies
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own audit log entries
CREATE POLICY "Users can view own audit log"
  ON audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert audit log entries
CREATE POLICY "Service role can insert audit log"
  ON audit_log FOR INSERT
  WITH CHECK (true);
