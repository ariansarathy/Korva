export type Plan = "free" | "starter" | "growth" | "scale";
export type Platform = "shopify" | "woocommerce" | "amazon";
export type SyncStatus = "pending" | "syncing" | "synced" | "error";
export type OrderStatus = "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";
export type CustomerSegment = "new" | "active" | "at_risk" | "churned" | "vip";
export type AdPlatform = "meta" | "google" | "tiktok" | "other";
export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "trialing" | "incomplete";
export type InsightCategory = "revenue" | "product" | "customer" | "inventory" | "marketing" | "anomaly" | "general";
export type InsightSeverity = "info" | "warning" | "critical" | "positive";
export type TeamMemberRole = "owner" | "admin" | "member" | "viewer";
export type TeamMemberStatus = "pending" | "accepted" | "declined" | "removed";
export type ReportType = "weekly_performance" | "monthly_deep_dive" | "product_performance" | "customer_insights";
export type ReportStatus = "pending" | "generating" | "completed" | "failed";
export type ScheduleFrequency = "daily" | "weekly" | "monthly";
export type NotificationChannel = "email" | "slack";
export type AdConnectionStatus = "active" | "expired" | "revoked";
export type AnomalySeverity = "info" | "warning" | "critical";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: Plan;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  user_id: string;
  platform: Platform;
  name: string;
  url: string | null;
  currency: string;
  timezone: string;
  access_token: string | null;
  last_synced_at: string | null;
  sync_status: SyncStatus;
  connected_at: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  external_id: string;
  title: string;
  description: string | null;
  category: string | null;
  sku: string | null;
  cost_price: number | null;
  sell_price: number | null;
  compare_at_price: number | null;
  inventory_qty: number;
  velocity_daily: number | null;
  days_of_stock: number | null;
  status: "active" | "draft" | "archived";
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  store_id: string;
  external_id: string;
  email_hash: string | null;
  first_name: string | null;
  last_name: string | null;
  first_order_date: string | null;
  last_order_date: string | null;
  lifetime_value: number;
  order_count: number;
  segment: CustomerSegment;
  city: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  store_id: string;
  external_id: string;
  customer_id: string | null;
  total: number;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  status: OrderStatus;
  channel: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  external_product_id: string | null;
  variant_id: string | null;
  title: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
  created_at: string;
}

export interface AdSpend {
  id: string;
  store_id: string;
  campaign_id: string;
  platform: AdPlatform;
  campaign_name: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue_attributed: number;
  date: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan: Plan;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  orders_used: number;
  orders_limit: number;
  ai_queries_used: number;
  ai_queries_limit: number;
  created_at: string;
  updated_at: string;
}

export interface Insight {
  id: string;
  store_id: string;
  title: string;
  body: string;
  category: InsightCategory;
  severity: InsightSeverity;
  metric_value: string | null;
  is_read: boolean;
  generated_at: string;
  created_at: string;
}

export interface AiQuery {
  id: string;
  user_id: string;
  store_id: string | null;
  question: string;
  generated_sql: string | null;
  response: string | null;
  chart_type: string | null;
  tokens_used: number;
  execution_time_ms: number;
  conversation_id: string | null;
  created_at: string;
}

// ─── Phase 2 interfaces ─────────────────────────────────────────

export interface TeamMember {
  id: string;
  user_id: string;
  member_id: string | null;
  email: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  invite_token: string | null;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  store_id: string;
  user_id: string;
  type: ReportType;
  title: string;
  data: Record<string, unknown>;
  html_content: string | null;
  status: ReportStatus;
  generated_at: string | null;
  created_at: string;
}

export interface ReportSchedule {
  id: string;
  store_id: string;
  user_id: string;
  report_type: ReportType;
  schedule: ScheduleFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  recipients: string[];
  enabled: boolean;
  last_sent_at: string | null;
  next_send_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  store_id: string | null;
  weekly_report: boolean;
  anomaly_alerts: boolean;
  inventory_alerts: boolean;
  slack_enabled: boolean;
  slack_webhook_url: string | null;
  email_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  rate_limit_per_minute: number;
  created_at: string;
}

export interface AdConnection {
  id: string;
  store_id: string;
  platform: "meta" | "google" | "tiktok";
  account_id: string;
  account_name: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  status: AdConnectionStatus;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Anomaly {
  id: string;
  store_id: string;
  metric: string;
  expected_value: number | null;
  actual_value: number | null;
  deviation_percent: number | null;
  severity: AnomalySeverity;
  description: string;
  notified: boolean;
  detected_at: string;
  created_at: string;
}

export interface NotificationLogEntry {
  id: string;
  user_id: string;
  store_id: string | null;
  channel: NotificationChannel;
  type: string;
  subject: string | null;
  status: "sent" | "failed" | "bounced";
  is_read: boolean;
  metadata: Record<string, unknown>;
  sent_at: string;
}

// ─── Phase 3 interfaces ─────────────────────────────────────────

export type ConversationStatus = "active" | "archived";
export type IntegrationProvider = "amazon" | "tiktok_ads" | "klaviyo" | "ga4" | "slack";
export type IntegrationStatus = "connected" | "disconnected" | "error" | "pending";

export interface AiConversation {
  id: string;
  user_id: string;
  store_id: string | null;
  title: string;
  status: ConversationStatus;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiConversationMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  generated_sql: string | null;
  chart_type: string | null;
  chart_data: Record<string, unknown> | null;
  tokens_used: number;
  execution_time_ms: number;
  created_at: string;
}

export interface SavedQuery {
  id: string;
  user_id: string;
  store_id: string | null;
  title: string;
  description: string | null;
  question: string;
  generated_sql: string | null;
  chart_type: string | null;
  is_pinned: boolean;
  run_count: number;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CohortSnapshot {
  id: string;
  store_id: string;
  cohort_month: string;
  months_since_first: number;
  customer_count: number;
  revenue: number;
  retention_rate: number | null;
  created_at: string;
}

export interface IntegrationConnection {
  id: string;
  store_id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  credentials_encrypted: string | null;
  settings: Record<string, unknown>;
  last_synced_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrafficSource {
  id: string;
  store_id: string;
  date: string;
  source: string;
  medium: string | null;
  campaign: string | null;
  sessions: number;
  pageviews: number;
  bounce_rate: number | null;
  avg_session_duration: number | null;
  conversions: number;
  revenue: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  store_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

// Database type for Supabase client — matches supabase-js v2 codegen format
// Uses explicit inline types (not Omit/Partial) to ensure GenericSchema compatibility
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          plan: string
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          plan?: string
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          plan?: string
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          id: string
          user_id: string
          platform: string
          name: string
          url: string | null
          currency: string
          timezone: string
          access_token: string | null
          last_synced_at: string | null
          sync_status: string
          connected_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          name: string
          url?: string | null
          currency?: string
          timezone?: string
          access_token?: string | null
          last_synced_at?: string | null
          sync_status?: string
          connected_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          name?: string
          url?: string | null
          currency?: string
          timezone?: string
          access_token?: string | null
          last_synced_at?: string | null
          sync_status?: string
          connected_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          store_id: string
          external_id: string
          title: string
          description: string | null
          category: string | null
          sku: string | null
          cost_price: number | null
          sell_price: number | null
          compare_at_price: number | null
          inventory_qty: number
          velocity_daily: number | null
          days_of_stock: number | null
          status: string
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          external_id: string
          title: string
          description?: string | null
          category?: string | null
          sku?: string | null
          cost_price?: number | null
          sell_price?: number | null
          compare_at_price?: number | null
          inventory_qty?: number
          velocity_daily?: number | null
          days_of_stock?: number | null
          status?: string
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          external_id?: string
          title?: string
          description?: string | null
          category?: string | null
          sku?: string | null
          cost_price?: number | null
          sell_price?: number | null
          compare_at_price?: number | null
          inventory_qty?: number
          velocity_daily?: number | null
          days_of_stock?: number | null
          status?: string
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          store_id: string
          external_id: string
          email_hash: string | null
          first_name: string | null
          last_name: string | null
          first_order_date: string | null
          last_order_date: string | null
          lifetime_value: number
          order_count: number
          segment: string
          city: string | null
          country: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          external_id: string
          email_hash?: string | null
          first_name?: string | null
          last_name?: string | null
          first_order_date?: string | null
          last_order_date?: string | null
          lifetime_value?: number
          order_count?: number
          segment?: string
          city?: string | null
          country?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          external_id?: string
          email_hash?: string | null
          first_name?: string | null
          last_name?: string | null
          first_order_date?: string | null
          last_order_date?: string | null
          lifetime_value?: number
          order_count?: number
          segment?: string
          city?: string | null
          country?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          store_id: string
          external_id: string
          customer_id: string | null
          total: number
          subtotal: number
          discount: number
          shipping: number
          tax: number
          status: string
          channel: string | null
          source: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          external_id: string
          customer_id?: string | null
          total: number
          subtotal?: number
          discount?: number
          shipping?: number
          tax?: number
          status?: string
          channel?: string | null
          source?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          external_id?: string
          customer_id?: string | null
          total?: number
          subtotal?: number
          discount?: number
          shipping?: number
          tax?: number
          status?: string
          channel?: string | null
          source?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          external_product_id: string | null
          variant_id: string | null
          title: string
          quantity: number
          unit_price: number
          discount: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          external_product_id?: string | null
          variant_id?: string | null
          title: string
          quantity: number
          unit_price: number
          discount?: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          external_product_id?: string | null
          variant_id?: string | null
          title?: string
          quantity?: number
          unit_price?: number
          discount?: number
          total_price?: number
          created_at?: string
        }
        Relationships: []
      }
      ad_spend: {
        Row: {
          id: string
          store_id: string
          campaign_id: string
          platform: string
          campaign_name: string | null
          spend: number
          impressions: number
          clicks: number
          conversions: number
          revenue_attributed: number
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          campaign_id: string
          platform: string
          campaign_name?: string | null
          spend: number
          impressions?: number
          clicks?: number
          conversions?: number
          revenue_attributed?: number
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          campaign_id?: string
          platform?: string
          campaign_name?: string | null
          spend?: number
          impressions?: number
          clicks?: number
          conversions?: number
          revenue_attributed?: number
          date?: string
          created_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          plan: string
          status: string
          current_period_start: string | null
          current_period_end: string | null
          orders_used: number
          orders_limit: number
          ai_queries_used: number
          ai_queries_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          plan?: string
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          orders_used?: number
          orders_limit?: number
          ai_queries_used?: number
          ai_queries_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          plan?: string
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          orders_used?: number
          orders_limit?: number
          ai_queries_used?: number
          ai_queries_limit?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      insights: {
        Row: {
          id: string
          store_id: string
          title: string
          body: string
          category: string
          severity: string
          metric_value: string | null
          is_read: boolean
          generated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          title: string
          body: string
          category: string
          severity: string
          metric_value?: string | null
          is_read?: boolean
          generated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          title?: string
          body?: string
          category?: string
          severity?: string
          metric_value?: string | null
          is_read?: boolean
          generated_at?: string
          created_at?: string
        }
        Relationships: []
      }
      ai_queries: {
        Row: {
          id: string
          user_id: string
          store_id: string | null
          question: string
          generated_sql: string | null
          response: string | null
          chart_type: string | null
          tokens_used: number
          execution_time_ms: number
          conversation_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          store_id?: string | null
          question: string
          generated_sql?: string | null
          response?: string | null
          chart_type?: string | null
          tokens_used?: number
          execution_time_ms?: number
          conversation_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          store_id?: string | null
          question?: string
          generated_sql?: string | null
          response?: string | null
          chart_type?: string | null
          tokens_used?: number
          execution_time_ms?: number
          conversation_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          user_id: string
          member_id: string | null
          email: string
          role: string
          status: string
          invite_token: string | null
          invited_at: string
          accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          member_id?: string | null
          email: string
          role?: string
          status?: string
          invite_token?: string | null
          invited_at?: string
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          member_id?: string | null
          email?: string
          role?: string
          status?: string
          invite_token?: string | null
          invited_at?: string
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          store_id: string
          user_id: string
          type: string
          title: string
          data: Record<string, unknown>
          html_content: string | null
          status: string
          generated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          user_id: string
          type: string
          title: string
          data?: Record<string, unknown>
          html_content?: string | null
          status?: string
          generated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          user_id?: string
          type?: string
          title?: string
          data?: Record<string, unknown>
          html_content?: string | null
          status?: string
          generated_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      report_schedules: {
        Row: {
          id: string
          store_id: string
          user_id: string
          report_type: string
          schedule: string
          day_of_week: number | null
          day_of_month: number | null
          recipients: string[]
          enabled: boolean
          last_sent_at: string | null
          next_send_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          user_id: string
          report_type: string
          schedule: string
          day_of_week?: number | null
          day_of_month?: number | null
          recipients?: string[]
          enabled?: boolean
          last_sent_at?: string | null
          next_send_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          user_id?: string
          report_type?: string
          schedule?: string
          day_of_week?: number | null
          day_of_month?: number | null
          recipients?: string[]
          enabled?: boolean
          last_sent_at?: string | null
          next_send_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          store_id: string | null
          weekly_report: boolean
          anomaly_alerts: boolean
          inventory_alerts: boolean
          slack_enabled: boolean
          slack_webhook_url: string | null
          email_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          store_id?: string | null
          weekly_report?: boolean
          anomaly_alerts?: boolean
          inventory_alerts?: boolean
          slack_enabled?: boolean
          slack_webhook_url?: string | null
          email_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          store_id?: string | null
          weekly_report?: boolean
          anomaly_alerts?: boolean
          inventory_alerts?: boolean
          slack_enabled?: boolean
          slack_webhook_url?: string | null
          email_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          name: string
          key_hash: string
          key_prefix: string
          scopes: string[]
          last_used_at: string | null
          expires_at: string | null
          revoked_at: string | null
          rate_limit_per_minute: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          key_hash: string
          key_prefix: string
          scopes?: string[]
          last_used_at?: string | null
          expires_at?: string | null
          revoked_at?: string | null
          rate_limit_per_minute?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          key_hash?: string
          key_prefix?: string
          scopes?: string[]
          last_used_at?: string | null
          expires_at?: string | null
          revoked_at?: string | null
          rate_limit_per_minute?: number
          created_at?: string
        }
        Relationships: []
      }
      ad_connections: {
        Row: {
          id: string
          store_id: string
          platform: string
          account_id: string
          account_name: string | null
          access_token: string
          refresh_token: string | null
          token_expires_at: string | null
          status: string
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          platform: string
          account_id: string
          account_name?: string | null
          access_token: string
          refresh_token?: string | null
          token_expires_at?: string | null
          status?: string
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          platform?: string
          account_id?: string
          account_name?: string | null
          access_token?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          status?: string
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      anomalies: {
        Row: {
          id: string
          store_id: string
          metric: string
          expected_value: number | null
          actual_value: number | null
          deviation_percent: number | null
          severity: string
          description: string
          notified: boolean
          detected_at: string
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          metric: string
          expected_value?: number | null
          actual_value?: number | null
          deviation_percent?: number | null
          severity?: string
          description: string
          notified?: boolean
          detected_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          metric?: string
          expected_value?: number | null
          actual_value?: number | null
          deviation_percent?: number | null
          severity?: string
          description?: string
          notified?: boolean
          detected_at?: string
          created_at?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          id: string
          user_id: string
          store_id: string | null
          channel: string
          type: string
          subject: string | null
          status: string
          is_read: boolean
          metadata: Record<string, unknown>
          sent_at: string
        }
        Insert: {
          id?: string
          user_id: string
          store_id?: string | null
          channel: string
          type: string
          subject?: string | null
          status?: string
          is_read?: boolean
          metadata?: Record<string, unknown>
          sent_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          store_id?: string | null
          channel?: string
          type?: string
          subject?: string | null
          status?: string
          is_read?: boolean
          metadata?: Record<string, unknown>
          sent_at?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          id: string
          user_id: string
          store_id: string | null
          title: string
          status: string
          message_count: number
          last_message_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          store_id?: string | null
          title?: string
          status?: string
          message_count?: number
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          store_id?: string | null
          title?: string
          status?: string
          message_count?: number
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_conversation_messages: {
        Row: {
          id: string
          conversation_id: string
          role: string
          content: string
          generated_sql: string | null
          chart_type: string | null
          chart_data: Record<string, unknown> | null
          tokens_used: number
          execution_time_ms: number
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: string
          content: string
          generated_sql?: string | null
          chart_type?: string | null
          chart_data?: Record<string, unknown> | null
          tokens_used?: number
          execution_time_ms?: number
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: string
          content?: string
          generated_sql?: string | null
          chart_type?: string | null
          chart_data?: Record<string, unknown> | null
          tokens_used?: number
          execution_time_ms?: number
          created_at?: string
        }
        Relationships: []
      }
      saved_queries: {
        Row: {
          id: string
          user_id: string
          store_id: string | null
          title: string
          description: string | null
          question: string
          generated_sql: string | null
          chart_type: string | null
          is_pinned: boolean
          run_count: number
          last_run_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          store_id?: string | null
          title: string
          description?: string | null
          question: string
          generated_sql?: string | null
          chart_type?: string | null
          is_pinned?: boolean
          run_count?: number
          last_run_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          store_id?: string | null
          title?: string
          description?: string | null
          question?: string
          generated_sql?: string | null
          chart_type?: string | null
          is_pinned?: boolean
          run_count?: number
          last_run_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cohort_snapshots: {
        Row: {
          id: string
          store_id: string
          cohort_month: string
          months_since_first: number
          customer_count: number
          revenue: number
          retention_rate: number | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          cohort_month: string
          months_since_first: number
          customer_count: number
          revenue?: number
          retention_rate?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          cohort_month?: string
          months_since_first?: number
          customer_count?: number
          revenue?: number
          retention_rate?: number | null
          created_at?: string
        }
        Relationships: []
      }
      integration_connections: {
        Row: {
          id: string
          store_id: string
          platform: string
          account_id: string
          account_name: string | null
          access_token: string
          refresh_token: string | null
          token_expires_at: string | null
          config: Record<string, unknown>
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          platform: string
          account_id?: string
          account_name?: string | null
          access_token?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          config?: Record<string, unknown>
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          platform?: string
          account_id?: string
          account_name?: string | null
          access_token?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          config?: Record<string, unknown>
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      traffic_sources: {
        Row: {
          id: string
          store_id: string
          date: string
          source: string
          medium: string | null
          campaign: string | null
          sessions: number
          users: number
          pageviews: number
          bounce_rate: number | null
          avg_session_duration: number | null
          conversions: number
          revenue: number
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          date: string
          source: string
          medium?: string | null
          campaign?: string | null
          sessions?: number
          users?: number
          pageviews?: number
          bounce_rate?: number | null
          avg_session_duration?: number | null
          conversions?: number
          revenue?: number
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          date?: string
          source?: string
          medium?: string | null
          campaign?: string | null
          sessions?: number
          users?: number
          pageviews?: number
          bounce_rate?: number | null
          avg_session_duration?: number | null
          conversions?: number
          revenue?: number
          created_at?: string
        }
        Relationships: []
      }
      rate_limit_counters: {
        Row: {
          id: string
          key: string
          count: number
          window_start: string
          created_at: string
        }
        Insert: {
          id?: string
          key: string
          count?: number
          window_start: string
          created_at?: string
        }
        Update: {
          id?: string
          key?: string
          count?: number
          window_start?: string
          created_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          store_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          metadata: Record<string, unknown>
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          store_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          metadata?: Record<string, unknown>
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          store_id?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          metadata?: Record<string, unknown>
          ip_address?: string | null
          created_at?: string
        }
        Relationships: []
      }
      webhook_configs: {
        Row: {
          id: string
          store_id: string
          url: string
          events: string[]
          secret: string
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          url: string
          events?: string[]
          secret: string
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          url?: string
          events?: string[]
          secret?: string
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      execute_readonly_query: {
        Args: { query_text: string; store_id_param: string }
        Returns: unknown
      }
      increment_ai_queries: {
        Args: { p_user_id: string }
        Returns: void
      }
      increment_orders_used: {
        Args: { p_user_id: string; p_count: number }
        Returns: void
      }
      check_rate_limit: {
        Args: { p_key: string; p_max_count: number; p_window_seconds: number }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
