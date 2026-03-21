"use client";

import { useState, useEffect } from "react";
import { Loader2, ExternalLink, RefreshCw, Zap } from "lucide-react";

interface AdConnection {
  id: string;
  platform: "meta" | "google" | "tiktok";
  account_name: string | null;
  status: string;
  last_synced_at: string | null;
}

const PLATFORM_INFO: Record<string, { label: string; color: string }> = {
  meta: { label: "Meta Ads", color: "#1877f2" },
  google: { label: "Google Ads", color: "#4285f4" },
  tiktok: { label: "TikTok Ads", color: "#00f2ea" },
};

export function AdConnections() {
  const [connections, setConnections] = useState<AdConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  async function fetchConnections() {
    try {
      const res = await fetch("/api/connectors/ads/connections");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections ?? []);
      }
    } catch (err) {
      console.error("Failed to load ad connections:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync(connectionId: string) {
    setSyncingId(connectionId);
    try {
      await fetch("/api/connectors/ads/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      await fetchConnections();
    } catch (err) {
      console.error("Ad sync failed:", err);
    } finally {
      setSyncingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Ad Platforms</h3>
      </div>

      {/* Connected accounts */}
      {connections.length > 0 && (
        <div className="space-y-2">
          {connections.map((conn) => {
            const info = PLATFORM_INFO[conn.platform];
            const isSyncing = syncingId === conn.id;
            return (
              <div
                key={conn.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${info?.color}15` }}
                  >
                    <Zap className="h-4 w-4" style={{ color: info?.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {conn.account_name ?? info?.label}
                    </p>
                    <p className="text-xs text-muted">
                      {conn.status === "active" ? "Connected" : conn.status}
                      {conn.last_synced_at &&
                        ` · Synced ${new Date(conn.last_synced_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleSync(conn.id)}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-background disabled:opacity-50"
                >
                  {isSyncing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Sync
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Connect buttons */}
      <div className="flex gap-2">
        <a
          href="/api/connectors/meta/install"
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-background"
        >
          <ExternalLink className="h-3 w-3" />
          Connect Meta Ads
        </a>
        <a
          href="/api/connectors/google/install"
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-background"
        >
          <ExternalLink className="h-3 w-3" />
          Connect Google Ads
        </a>
        <a
          href="/api/connectors/tiktok/install"
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-background"
        >
          <ExternalLink className="h-3 w-3" />
          Connect TikTok Ads
        </a>
      </div>
    </div>
  );
}
