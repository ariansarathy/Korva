"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  Loader2,
  ShoppingBag,
  ArrowRight,
  Package,
  Users,
  ShoppingCart,
  Store,
} from "lucide-react";

type Step = "connect" | "sync" | "done";
type Platform = "shopify" | "woocommerce" | "amazon" | null;

interface SyncStatus {
  status: string;
  storeName?: string;
  counts: {
    products: number;
    customers: number;
    orders: number;
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = searchParams.get("store");
  const initialStep = (searchParams.get("step") as Step) || "connect";
  const initialPlatform = (searchParams.get("platform") as Platform) || null;

  const [step, setStep] = useState<Step>(initialStep);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(initialPlatform);
  const [shopDomain, setShopDomain] = useState("");
  const [wooUrl, setWooUrl] = useState("");
  const [wooKey, setWooKey] = useState("");
  const [wooSecret, setWooSecret] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Determine which platform is being synced
  const syncPlatform = initialPlatform || selectedPlatform || "shopify";

  // Start sync if we arrived from OAuth callback or WooCommerce connect
  useEffect(() => {
    if (storeId && step === "sync") {
      startSync(storeId);
    }
  }, [storeId, step]);

  function handleShopifyConnect() {
    const domain = shopDomain.trim();
    if (!domain) return;

    const fullDomain = domain.includes(".myshopify.com")
      ? domain
      : `${domain}.myshopify.com`;

    setConnecting(true);
    window.location.href = `/api/connectors/shopify/install?shop=${encodeURIComponent(fullDomain)}`;
  }

  async function handleWooCommerceConnect() {
    const url = wooUrl.trim();
    const key = wooKey.trim();
    const secret = wooSecret.trim();
    if (!url || !key || !secret) return;

    setConnecting(true);
    setConnectError("");

    try {
      const res = await fetch("/api/connectors/woocommerce/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl: url, consumerKey: key, consumerSecret: secret }),
      });

      const data = await res.json();

      if (!res.ok) {
        setConnectError(data.error || "Failed to connect");
        setConnecting(false);
        return;
      }

      // Redirect to sync step
      window.location.href = `/onboarding?store=${data.storeId}&step=sync&platform=woocommerce`;
    } catch {
      setConnectError("Connection failed. Please check your credentials.");
      setConnecting(false);
    }
  }

  async function startSync(sid: string) {
    setSyncing(true);

    const syncEndpoint = syncPlatform === "woocommerce"
      ? "/api/connectors/woocommerce/sync"
      : "/api/connectors/shopify/sync";
    const statusEndpoint = syncPlatform === "woocommerce"
      ? `/api/connectors/woocommerce/sync/status?storeId=${sid}`
      : `/api/connectors/shopify/sync/status?storeId=${sid}`;

    // Start the sync
    try {
      await fetch(syncEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: sid }),
      });
    } catch (err) {
      console.error("Sync start failed:", err);
    }

    // Poll for status
    const interval = setInterval(async () => {
      try {
        const res = await fetch(statusEndpoint);
        const data = await res.json();
        setSyncStatus(data);

        if (data.status === "synced" || data.status === "error") {
          clearInterval(interval);
          setSyncing(false);
          if (data.status === "synced") {
            setStep("done");
          }
        }
      } catch {
        // continue polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }

  return (
    <div className="mx-auto max-w-2xl py-12">
      {/* Steps indicator */}
      <div className="mb-12 flex items-center justify-center gap-4">
        {[
          { key: "account", label: "Account", complete: true },
          { key: "connect", label: "Connect Store", complete: step === "sync" || step === "done" },
          { key: "sync", label: "Sync Data", complete: step === "done" },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-4">
            {i > 0 && (
              <div
                className={`h-px w-12 ${
                  s.complete ? "bg-primary" : "bg-border"
                }`}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  s.complete
                    ? "bg-primary text-white"
                    : "border-2 border-border text-muted"
                }`}
              >
                {s.complete ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`text-sm font-medium ${
                  s.complete ? "text-foreground" : "text-muted"
                }`}
              >
                {s.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Step: Connect Store */}
      {step === "connect" && !selectedPlatform && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <ShoppingBag className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Connect your store
          </h2>
          <p className="mt-2 text-sm text-muted">
            Choose your e-commerce platform to get started.
          </p>

          <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedPlatform("shopify")}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-border p-6 transition-all hover:border-primary hover:bg-primary/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#96bf48]/10">
                <ShoppingBag className="h-6 w-6 text-[#96bf48]" />
              </div>
              <span className="text-sm font-semibold text-foreground">Shopify</span>
              <span className="text-xs text-muted">OAuth connection</span>
            </button>

            <button
              onClick={() => setSelectedPlatform("woocommerce")}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-border p-6 transition-all hover:border-primary hover:bg-primary/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7f54b3]/10">
                <Store className="h-6 w-6 text-[#7f54b3]" />
              </div>
              <span className="text-sm font-semibold text-foreground">WooCommerce</span>
              <span className="text-xs text-muted">API key connection</span>
            </button>
          </div>
        </div>
      )}

      {/* Step: Connect Shopify */}
      {step === "connect" && selectedPlatform === "shopify" && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#96bf48]/10">
            <ShoppingBag className="h-8 w-8 text-[#96bf48]" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Connect your Shopify store
          </h2>
          <p className="mt-2 text-sm text-muted">
            Enter your Shopify store domain to get started. We&apos;ll securely
            connect via OAuth.
          </p>

          <div className="mx-auto mt-6 max-w-sm">
            <input
              type="text"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleShopifyConnect()}
              placeholder="yourstore.myshopify.com"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-center text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <button
              onClick={handleShopifyConnect}
              disabled={!shopDomain.trim() || connecting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Connect Store
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <button
              onClick={() => setSelectedPlatform(null)}
              className="mt-3 text-sm text-muted hover:text-foreground"
            >
              ← Choose a different platform
            </button>
          </div>
        </div>
      )}

      {/* Step: Connect WooCommerce */}
      {step === "connect" && selectedPlatform === "woocommerce" && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7f54b3]/10">
            <Store className="h-8 w-8 text-[#7f54b3]" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Connect your WooCommerce store
          </h2>
          <p className="mt-2 text-sm text-muted">
            Enter your WooCommerce site URL and REST API credentials. You can
            generate API keys in WooCommerce → Settings → Advanced → REST API.
          </p>

          <div className="mx-auto mt-6 max-w-sm space-y-3">
            <input
              type="text"
              value={wooUrl}
              onChange={(e) => setWooUrl(e.target.value)}
              placeholder="https://yourstore.com"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-center text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <input
              type="text"
              value={wooKey}
              onChange={(e) => setWooKey(e.target.value)}
              placeholder="Consumer Key (ck_...)"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-center text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="password"
              value={wooSecret}
              onChange={(e) => setWooSecret(e.target.value)}
              placeholder="Consumer Secret (cs_...)"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-center text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />

            {connectError && (
              <p className="text-sm text-danger">{connectError}</p>
            )}

            <button
              onClick={handleWooCommerceConnect}
              disabled={!wooUrl.trim() || !wooKey.trim() || !wooSecret.trim() || connecting}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Connect Store
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <button
              onClick={() => setSelectedPlatform(null)}
              className="mt-1 text-sm text-muted hover:text-foreground"
            >
              ← Choose a different platform
            </button>
          </div>
        </div>
      )}

      {/* Step: Sync Progress */}
      {step === "sync" && (
        <div className="rounded-xl border border-border bg-surface p-8">
          <div className="text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <h2 className="mt-4 text-xl font-bold text-foreground">
              Syncing your data
            </h2>
            <p className="mt-2 text-sm text-muted">
              {syncStatus?.storeName
                ? `Importing data from ${syncStatus.storeName}...`
                : "Starting import..."}
            </p>
          </div>

          {syncStatus && (
            <div className="mt-8 grid grid-cols-3 gap-4">
              <SyncCounter
                icon={Package}
                label="Products"
                count={syncStatus.counts.products}
              />
              <SyncCounter
                icon={Users}
                label="Customers"
                count={syncStatus.counts.customers}
              />
              <SyncCounter
                icon={ShoppingCart}
                label="Orders"
                count={syncStatus.counts.orders}
              />
            </div>
          )}

          {syncStatus?.status === "error" && (
            <div className="mt-6 rounded-lg border border-danger/30 bg-danger/5 p-4 text-center">
              <p className="text-sm text-danger">
                Sync encountered an error. Please try again.
              </p>
              <button
                onClick={() => storeId && startSync(storeId)}
                className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10">
            <Check className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            You&apos;re all set!
          </h2>
          <p className="mt-2 text-sm text-muted">
            Your store data has been synced. You can now explore your dashboard
            and start asking questions.
          </p>

          {syncStatus && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <SyncCounter
                icon={Package}
                label="Products"
                count={syncStatus.counts.products}
              />
              <SyncCounter
                icon={Users}
                label="Customers"
                count={syncStatus.counts.customers}
              />
              <SyncCounter
                icon={ShoppingCart}
                label="Orders"
                count={syncStatus.counts.orders}
              />
            </div>
          )}

          <button
            onClick={() => router.push("/dashboard")}
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function SyncCounter({
  icon: Icon,
  label,
  count,
}: {
  icon: typeof Package;
  label: string;
  count: number;
}) {
  return (
    <div className="rounded-lg border border-border p-4 text-center">
      <Icon className="mx-auto h-5 w-5 text-muted" />
      <p className="mt-2 text-2xl font-bold text-foreground">
        {count.toLocaleString()}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
