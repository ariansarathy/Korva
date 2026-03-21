"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  CheckCircle2,
  ExternalLink,
  BarChart3,
  Mail,
  LineChart,
  MessageSquare,
} from "lucide-react";

interface IntegrationStatus {
  provider: string;
  status: string;
  last_synced_at: string | null;
}

export function IntegrationConnections({ storeId }: { storeId?: string }) {
  const [connections, setConnections] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [klaviyoKey, setKlaviyoKey] = useState("");
  const [connectingKlaviyo, setConnectingKlaviyo] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // In a full implementation, fetch integration status
    setLoading(false);
  }, []);

  async function handleKlaviyoConnect() {
    if (!klaviyoKey.trim() || !storeId) {
      setError("Please enter your Klaviyo API key");
      return;
    }

    setConnectingKlaviyo(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/connectors/klaviyo/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, apiKey: klaviyoKey.trim() }),
      });

      if (res.ok) {
        setSuccess("Klaviyo connected successfully!");
        setKlaviyoKey("");
        setConnections((prev) => [
          ...prev.filter((c) => c.provider !== "klaviyo"),
          { provider: "klaviyo", status: "connected", last_synced_at: null },
        ]);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to connect Klaviyo");
      }
    } catch {
      setError("Connection failed");
    } finally {
      setConnectingKlaviyo(false);
    }
  }

  function handleTikTokConnect() {
    window.location.href = "/api/connectors/tiktok/install";
  }

  function handleGA4Connect() {
    window.location.href = "/api/connectors/ga4/install";
  }

  function handleSlackConnect() {
    window.location.href = "/api/connectors/slack/install";
  }

  const isKlaviyoConnected = connections.some(
    (c) => c.provider === "klaviyo" && c.status === "connected"
  );
  const isTikTokConnected = connections.some(
    (c) => c.provider === "tiktok_ads" && c.status === "connected"
  );
  const isGA4Connected = connections.some(
    (c) => c.provider === "ga4" && c.status === "connected"
  );
  const isSlackConnected = connections.some(
    (c) => c.provider === "slack" && c.status === "connected"
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      {/* TikTok Ads */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-hover">
              <BarChart3 className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">TikTok Ads</p>
              <p className="text-xs text-muted">
                Sync campaign spend and performance metrics
              </p>
            </div>
          </div>
          {isTikTokConnected ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
            </span>
          ) : (
            <button
              onClick={handleTikTokConnect}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Klaviyo */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-hover">
              <Mail className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Klaviyo</p>
              <p className="text-xs text-muted">
                Push customer segments to Klaviyo lists
              </p>
            </div>
          </div>
          {isKlaviyoConnected ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
            </span>
          ) : (
            <span className="text-xs text-muted">API Key required</span>
          )}
        </div>
        {!isKlaviyoConnected && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="password"
              value={klaviyoKey}
              onChange={(e) => {
                setKlaviyoKey(e.target.value);
                setError("");
              }}
              placeholder="pk_xxxxx..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleKlaviyoConnect}
              disabled={connectingKlaviyo}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {connectingKlaviyo ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Connect
            </button>
          </div>
        )}
      </div>

      {/* Google Analytics 4 */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-hover">
              <LineChart className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Google Analytics 4
              </p>
              <p className="text-xs text-muted">
                Sync traffic sources and conversion data
              </p>
            </div>
          </div>
          {isGA4Connected ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
            </span>
          ) : (
            <button
              onClick={handleGA4Connect}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Slack */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-hover">
              <MessageSquare className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Slack</p>
              <p className="text-xs text-muted">
                Send notifications to a Slack channel
              </p>
            </div>
          </div>
          {isSlackConnected ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
            </span>
          ) : (
            <button
              onClick={handleSlackConnect}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Connect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
