"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Store,
  CreditCard,
  Users,
  Bell,
  Database,
  ShoppingBag,
  Plus,
  ExternalLink,
  Check,
  Loader2,
  Key,
  RefreshCw,
  Globe,
  Clock,
  User,
  ScrollText,
  Webhook,
} from "lucide-react";
import { NotificationToggles } from "@/components/settings/notification-toggles";
import { TeamManagement } from "@/components/settings/team-management";
import { DataExport } from "@/components/settings/data-export";
import { AdConnections } from "@/components/settings/ad-connections";
import { ApiKeys } from "@/components/settings/api-keys";
import { IntegrationConnections } from "@/components/settings/integration-connections";
import { PlanGate } from "@/components/shared/plan-gate";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { ActivityLog } from "@/components/settings/activity-log";
import { WebhookSettings } from "@/components/settings/webhook-settings";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "stores", label: "Connected Stores", icon: Store },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "team", label: "Team", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "data", label: "Data & Privacy", icon: Database },
  { id: "integrations", label: "Integrations", icon: ExternalLink },
  { id: "api", label: "API", icon: Key },
  { id: "activity", label: "Activity Log", icon: ScrollText },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
];

const platforms = [
  {
    name: "Shopify",
    icon: ShoppingBag,
    status: "available" as const,
    description: "Connect your Shopify store",
  },
  {
    name: "WooCommerce",
    icon: ShoppingBag,
    status: "available" as const,
    description: "Connect your WooCommerce store",
  },
  {
    name: "Amazon",
    icon: ShoppingBag,
    status: "available" as const,
    description: "Connect Amazon Seller Central",
  },
];

interface ConnectedStore {
  id: string;
  name: string;
  platform: string;
  url: string | null;
  sync_status: string;
  last_synced_at: string | null;
  connected_at: string;
}

function formatSyncTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const syncStatusColors: Record<string, string> = {
  synced: "text-success",
  syncing: "text-warning",
  pending: "text-muted",
  error: "text-danger",
};

const platformIcons: Record<string, string> = {
  shopify: "S",
  woocommerce: "W",
  amazon: "A",
};

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const tabParam = searchParams.get("tab");
  const validTabs = tabs.map((t) => t.id);
  const [activeTab, setActiveTab] = useState(
    tabParam && validTabs.includes(tabParam) ? tabParam : "stores"
  );
  const [shopDomain, setShopDomain] = useState("");
  const [showShopInput, setShowShopInput] = useState(false);
  const [showWooInput, setShowWooInput] = useState(false);
  const [wooUrl, setWooUrl] = useState("");
  const [wooKey, setWooKey] = useState("");
  const [wooSecret, setWooSecret] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState("");
  const [connectError, setConnectError] = useState("");
  const [connectedStores, setConnectedStores] = useState<ConnectedStore[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);

  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch("/api/stores");
      if (res.ok) {
        const data = await res.json();
        setConnectedStores(data.stores ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setStoresLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  function handleShopifyConnect() {
    if (!showShopInput) {
      setShowShopInput(true);
      return;
    }

    const domain = shopDomain.trim();
    if (!domain) {
      setConnectError("Please enter your Shopify store domain");
      return;
    }

    const fullDomain = domain.includes(".myshopify.com")
      ? domain
      : `${domain}.myshopify.com`;

    setConnecting(true);
    setConnectingPlatform("Shopify");
    setConnectError("");
    window.location.href = `/api/connectors/shopify/install?shop=${encodeURIComponent(fullDomain)}`;
  }

  async function handleWooCommerceConnect() {
    if (!showWooInput) {
      setShowWooInput(true);
      return;
    }

    if (!wooUrl.trim() || !wooKey.trim() || !wooSecret.trim()) {
      setConnectError("All WooCommerce fields are required");
      return;
    }

    setConnecting(true);
    setConnectingPlatform("WooCommerce");
    setConnectError("");

    try {
      const res = await fetch("/api/connectors/woocommerce/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: wooUrl.trim(),
          consumerKey: wooKey.trim(),
          consumerSecret: wooSecret.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setConnectError(data.error || "Connection failed");
        setConnecting(false);
        return;
      }

      router.push(`/onboarding?store=${data.storeId}&step=sync&platform=woocommerce`);
    } catch {
      setConnectError("Failed to connect. Please try again.");
      setConnecting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-secondary">
          Manage your account, connections, and preferences.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Tab Navigation */}
        <div className="w-56 shrink-0 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-secondary hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {activeTab === "profile" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Profile
              </h2>
              <ProfileSettings />
            </div>
          )}

          {activeTab === "stores" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Connected Stores
                </h2>
              </div>

              {oauthError && (
                <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                  Failed to connect store. Please try again.{" "}
                  <span className="text-xs text-muted">({oauthError})</span>
                </div>
              )}

              {/* Connected stores list */}
              {storesLoading ? (
                <div className="rounded-xl border border-border bg-surface p-6">
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted" />
                  </div>
                </div>
              ) : connectedStores.length > 0 ? (
                <div className="space-y-3">
                  {connectedStores.map((store) => (
                    <div
                      key={store.id}
                      className="rounded-xl border border-border bg-surface p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                            {platformIcons[store.platform] ?? "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {store.name}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-muted capitalize">
                                {store.platform}
                              </span>
                              {store.url && (
                                <span className="flex items-center gap-1 text-xs text-muted">
                                  <Globe className="h-3 w-3" />
                                  {store.url}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p
                              className={`text-xs font-medium capitalize ${syncStatusColors[store.sync_status] ?? "text-muted"}`}
                            >
                              <RefreshCw className="inline h-3 w-3 mr-1" />
                              {store.sync_status}
                            </p>
                            <p className="flex items-center gap-1 text-xs text-muted mt-0.5">
                              <Clock className="h-3 w-3" />
                              Last synced: {formatSyncTime(store.last_synced_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Connect new store */}
              <div className="rounded-xl border border-border bg-surface p-6">
                <p className="mb-4 text-sm text-muted">
                  {connectedStores.length > 0
                    ? "Connect another e-commerce platform."
                    : "Connect your e-commerce platform to start syncing data."}
                </p>
                <div className="space-y-3">
                  {platforms.map((platform) => {
                    const Icon = platform.icon;
                    const isShopify = platform.name === "Shopify";
                    const isWoo = platform.name === "WooCommerce";
                    const isConnecting =
                      connecting && connectingPlatform === platform.name;
                    return (
                      <div
                        key={platform.name}
                        className="rounded-lg border border-border p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-hover">
                              <Icon className="h-5 w-5 text-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {platform.name}
                              </p>
                              <p className="text-xs text-muted">
                                {platform.description}
                              </p>
                            </div>
                          </div>
                          {platform.status === "available" ? (
                            <button
                              onClick={
                                isShopify
                                  ? handleShopifyConnect
                                  : isWoo
                                    ? handleWooCommerceConnect
                                    : platform.name === "Amazon"
                                      ? () => {
                                          setConnecting(true);
                                          setConnectingPlatform("Amazon");
                                          window.location.href = "/api/connectors/amazon/install";
                                        }
                                      : undefined
                              }
                              disabled={connecting}
                              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                            >
                              {isConnecting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Plus className="h-3.5 w-3.5" />
                              )}
                              Connect
                            </button>
                          ) : (
                            <span className="text-xs text-muted">
                              Coming soon
                            </span>
                          )}
                        </div>

                        {/* Shopify domain input */}
                        {isShopify && showShopInput && (
                          <div className="mt-3 flex items-center gap-2">
                            <input
                              type="text"
                              value={shopDomain}
                              onChange={(e) => {
                                setShopDomain(e.target.value);
                                setConnectError("");
                              }}
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleShopifyConnect()
                              }
                              placeholder="yourstore.myshopify.com"
                              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                            />
                            {connectError &&
                              connectingPlatform === "Shopify" && (
                                <p className="text-xs text-danger">
                                  {connectError}
                                </p>
                              )}
                          </div>
                        )}

                        {/* WooCommerce credentials input */}
                        {isWoo && showWooInput && (
                          <div className="mt-3 space-y-2">
                            <input
                              type="text"
                              value={wooUrl}
                              onChange={(e) => {
                                setWooUrl(e.target.value);
                                setConnectError("");
                              }}
                              placeholder="https://yourstore.com"
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                            />
                            <input
                              type="text"
                              value={wooKey}
                              onChange={(e) => {
                                setWooKey(e.target.value);
                                setConnectError("");
                              }}
                              placeholder="Consumer Key (ck_...)"
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <input
                              type="password"
                              value={wooSecret}
                              onChange={(e) => {
                                setWooSecret(e.target.value);
                                setConnectError("");
                              }}
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleWooCommerceConnect()
                              }
                              placeholder="Consumer Secret (cs_...)"
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            {connectError &&
                              connectingPlatform === "WooCommerce" && (
                                <p className="text-xs text-danger">
                                  {connectError}
                                </p>
                              )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ad Platforms */}
              <div className="rounded-xl border border-border bg-surface p-6">
                <AdConnections />
              </div>
            </div>
          )}

          {activeTab === "billing" && <BillingTab />}

          {activeTab === "team" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Team Members
              </h2>
              <TeamManagement />
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Notification Preferences
              </h2>
              <NotificationToggles />
            </div>
          )}

          {activeTab === "data" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Data & Privacy
              </h2>
              <DataExport />
            </div>
          )}

          {activeTab === "integrations" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Integrations
              </h2>
              <p className="text-sm text-muted">
                Connect third-party platforms for email marketing, analytics, and notifications.
              </p>
              <IntegrationConnections />
            </div>
          )}

          {activeTab === "api" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                API Access
              </h2>
              <p className="text-sm text-muted">
                Create API keys to access the Korva REST API programmatically.
              </p>
              <PlanGate
                requiredPlan="scale"
                feature="api_access"
                featureLabel="API Access"
              >
                <ApiKeys />
              </PlanGate>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Activity Log
              </h2>
              <ActivityLog />
            </div>
          )}

          {activeTab === "webhooks" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Webhooks
              </h2>
              <WebhookSettings />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Billing Tab Component ────────────────────────────────────

interface SubscriptionInfo {
  plan: string;
  status: string;
  ordersUsed: number;
  ordersLimit: number;
  aiQueriesUsed: number;
  aiQueriesLimit: number;
}

const billingPlans = [
  {
    name: "Starter",
    price: "$49",
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? "",
    features: [
      "1 store",
      "1,000 orders/mo",
      "100 AI queries/mo",
      "Email support",
    ],
  },
  {
    name: "Growth",
    price: "$149",
    priceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID ?? "",
    popular: true,
    features: [
      "3 stores",
      "10,000 orders/mo",
      "500 AI queries/mo",
      "Priority support",
      "Custom reports",
    ],
  },
  {
    name: "Scale",
    price: "$299",
    priceId: process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID ?? "",
    features: [
      "10 stores",
      "Unlimited orders",
      "Unlimited AI queries",
      "API access",
      "Dedicated support",
    ],
  },
];

function BillingTab() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const res = await fetch("/api/plan-check?feature=api_access");
        if (res.ok) {
          const data = await res.json();
          setSubInfo({
            plan: data.plan ?? "free",
            status: data.status ?? "active",
            ordersUsed: data.ordersUsed ?? 0,
            ordersLimit: data.ordersLimit ?? 0,
            aiQueriesUsed: data.aiQueriesUsed ?? 0,
            aiQueriesLimit: data.aiQueriesLimit ?? 10,
          });
        }
      } catch {
        // Silently fail
      } finally {
        setSubLoading(false);
      }
    }
    fetchSubscription();
  }, []);

  async function handleUpgrade(priceId: string, planName: string) {
    setLoadingPlan(planName);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handleManageBilling() {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Portal error:", err);
    } finally {
      setLoadingPortal(false);
    }
  }

  const planLabel = subInfo?.plan
    ? subInfo.plan.charAt(0).toUpperCase() + subInfo.plan.slice(1)
    : "Free";
  const isFreePlan = !subInfo || subInfo.plan === "free";
  const currentPlanName = planLabel.toLowerCase();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Billing</h2>
      <div className="rounded-xl border border-border bg-surface p-6">
        {subLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Current Plan
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {planLabel}
              </p>
              {isFreePlan ? (
                <p className="mt-1 text-xs text-muted">
                  Free tier &bull; Upgrade to unlock more features
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted capitalize">
                  Status: {subInfo?.status ?? "active"}
                </p>
              )}

              {/* Usage meters */}
              {subInfo && (
                <div className="mt-4 space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-xs text-secondary mb-1">
                      <span>AI Queries</span>
                      <span>
                        {subInfo.aiQueriesUsed} /{" "}
                        {subInfo.aiQueriesLimit === -1
                          ? "Unlimited"
                          : subInfo.aiQueriesLimit}
                      </span>
                    </div>
                    {subInfo.aiQueriesLimit !== -1 && (
                      <div className="h-1.5 w-48 rounded-full bg-surface-hover">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{
                            width: `${Math.min(100, (subInfo.aiQueriesUsed / subInfo.aiQueriesLimit) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-secondary mb-1">
                      <span>Orders</span>
                      <span>
                        {subInfo.ordersUsed} /{" "}
                        {subInfo.ordersLimit === -1
                          ? "Unlimited"
                          : subInfo.ordersLimit}
                      </span>
                    </div>
                    {subInfo.ordersLimit !== -1 && subInfo.ordersLimit > 0 && (
                      <div className="h-1.5 w-48 rounded-full bg-surface-hover">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{
                            width: `${Math.min(100, (subInfo.ordersUsed / subInfo.ordersLimit) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleManageBilling}
              disabled={loadingPortal}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              {loadingPortal ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              Manage Billing
            </button>
          </div>
        )}
      </div>

      {/* Plan comparison */}
      <div className="grid grid-cols-3 gap-4">
        {billingPlans.map((plan) => {
          const isCurrent = plan.name.toLowerCase() === currentPlanName;
          return (
            <div
              key={plan.name}
              className={`rounded-xl border p-5 ${
                plan.popular
                  ? "border-primary bg-primary/5"
                  : "border-border bg-surface"
              }`}
            >
              {plan.popular && (
                <span className="mb-2 inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                  Most Popular
                </span>
              )}
              <p className="text-sm font-semibold text-foreground">
                {plan.name}
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {plan.price}
                <span className="text-sm font-normal text-muted">/mo</span>
              </p>
              <ul className="mt-3 space-y-2">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-xs text-secondary"
                  >
                    <Check className="h-3.5 w-3.5 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan.priceId, plan.name)}
                disabled={loadingPlan === plan.name || isCurrent}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  isCurrent
                    ? "border border-border bg-surface-hover text-foreground"
                    : "bg-primary text-white hover:bg-primary-hover"
                }`}
              >
                {loadingPlan === plan.name ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {isCurrent ? "Current Plan" : "Upgrade"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
