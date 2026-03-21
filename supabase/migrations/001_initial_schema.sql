-- Korva Initial Database Schema
-- Run this against your Supabase PostgreSQL database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'growth', 'scale')),
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STORES
-- ============================================
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('shopify', 'woocommerce', 'amazon')),
  name TEXT NOT NULL,
  url TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  access_token TEXT, -- encrypted OAuth token
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  webhook_secret TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stores"
  ON stores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stores"
  ON stores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stores"
  ON stores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stores"
  ON stores FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_stores_user_id ON stores(user_id);

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  sku TEXT,
  cost_price DECIMAL(12,2),
  sell_price DECIMAL(12,2),
  compare_at_price DECIMAL(12,2),
  inventory_qty INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, external_id)
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view products of own stores"
  ON products FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage products"
  ON products FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_products_store_id ON products(store_id);

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  email_hash TEXT,
  first_name TEXT,
  last_name TEXT,
  first_order_date TIMESTAMPTZ,
  last_order_date TIMESTAMPTZ,
  lifetime_value DECIMAL(12,2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  segment TEXT DEFAULT 'new' CHECK (segment IN ('new', 'active', 'at_risk', 'churned', 'vip')),
  city TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, external_id)
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view customers of own stores"
  ON customers FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage customers"
  ON customers FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_customers_store_id ON customers(store_id);
CREATE INDEX idx_customers_segment ON customers(store_id, segment);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  shipping DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded')),
  channel TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, external_id)
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view orders of own stores"
  ON orders FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage orders"
  ON orders FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_orders_store_id ON orders(store_id);
CREATE INDEX idx_orders_created_at ON orders(store_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(store_id, status);

-- ============================================
-- ORDER ITEMS
-- ============================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  external_product_id TEXT,
  variant_id TEXT,
  title TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view order items of own orders"
  ON order_items FOR SELECT
  USING (order_id IN (
    SELECT o.id FROM orders o
    JOIN stores s ON o.store_id = s.id
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage order items"
  ON order_items FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- ============================================
-- AD SPEND
-- ============================================
CREATE TABLE ad_spend (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok', 'other')),
  campaign_name TEXT,
  spend DECIMAL(12,2) NOT NULL DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue_attributed DECIMAL(12,2) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, campaign_id, date)
);

ALTER TABLE ad_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ad spend of own stores"
  ON ad_spend FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage ad spend"
  ON ad_spend FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_ad_spend_store_date ON ad_spend(store_id, date DESC);

-- ============================================
-- SUBSCRIPTIONS (Stripe billing)
-- ============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'growth', 'scale')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing', 'incomplete')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  orders_used INTEGER DEFAULT 0,
  orders_limit INTEGER DEFAULT 0,
  ai_queries_used INTEGER DEFAULT 0,
  ai_queries_limit INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- ============================================
-- AI QUERY LOG
-- ============================================
CREATE TABLE ai_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  generated_sql TEXT,
  response TEXT,
  chart_type TEXT,
  tokens_used INTEGER DEFAULT 0,
  execution_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai queries"
  ON ai_queries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai queries"
  ON ai_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_ai_queries_user_id ON ai_queries(user_id, created_at DESC);

-- ============================================
-- INSIGHTS (AI-generated)
-- ============================================
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('revenue', 'product', 'customer', 'inventory', 'marketing', 'anomaly', 'general')),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'positive')),
  metric_value TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view insights of own stores"
  ON insights FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "Users can update insights of own stores"
  ON insights FOR UPDATE
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE INDEX idx_insights_store_id ON insights(store_id, generated_at DESC);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
