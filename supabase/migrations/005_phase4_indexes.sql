-- ================================================================
-- Phase 4: Performance Indexes
-- ================================================================

-- Customer order history lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- Ad spend queries grouped by platform and date
CREATE INDEX IF NOT EXISTS idx_ad_spend_store_platform_date ON ad_spend(store_id, platform, date DESC);

-- Filtered product listings (paginated products page)
CREATE INDEX IF NOT EXISTS idx_products_store_status ON products(store_id, status);

-- Unread insights — partial index for dashboard badge queries
CREATE INDEX IF NOT EXISTS idx_insights_store_unread ON insights(store_id, is_read) WHERE is_read = false;

-- Unread notifications — partial index for notification bell count
CREATE INDEX IF NOT EXISTS idx_notification_log_user_unread ON notification_log(user_id, is_read) WHERE is_read = false;

-- Top customers by LTV (customers page default sort)
CREATE INDEX IF NOT EXISTS idx_customers_store_ltv ON customers(store_id, lifetime_value DESC);

-- Orders by store + created_at for KPI and revenue trend queries
CREATE INDEX IF NOT EXISTS idx_orders_store_created ON orders(store_id, created_at DESC);

-- Customer segment counts (for dashboard segment breakdown)
CREATE INDEX IF NOT EXISTS idx_customers_store_segment ON customers(store_id, segment);

-- AI query history lookup
CREATE INDEX IF NOT EXISTS idx_ai_queries_user_created ON ai_queries(user_id, created_at DESC);

-- Conversation message lookup by conversation
CREATE INDEX IF NOT EXISTS idx_ai_conv_messages_conv ON ai_conversation_messages(conversation_id, created_at ASC);
