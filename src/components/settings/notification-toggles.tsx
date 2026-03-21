"use client";

import { useState, useEffect } from "react";
import { Loader2, Bell, Mail, MessageSquare, ExternalLink, CheckCircle2 } from "lucide-react";

interface Preferences {
  weekly_report: boolean;
  anomaly_alerts: boolean;
  inventory_alerts: boolean;
  email_enabled: boolean;
  slack_enabled: boolean;
  slack_webhook_url: string | null;
}

export function NotificationToggles() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const saving = false; // Optimistic UI — toggles respond instantly
  const [slackUrl, setSlackUrl] = useState("");
  const [testingSlack, setTestingSlack] = useState(false);
  const [slackOAuthConnected, setSlackOAuthConnected] = useState(false);
  const [slackChannelName, setSlackChannelName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrefs() {
      try {
        const res = await fetch("/api/notifications/preferences");
        if (res.ok) {
          const data = await res.json();
          setPrefs(data.preferences);
          setSlackUrl(data.preferences.slack_webhook_url || "");
        }
      } catch (err) {
        console.error("Failed to load preferences:", err);
      } finally {
        setLoading(false);
      }
    }

    async function checkSlackOAuth() {
      try {
        const res = await fetch("/api/connectors/slack/channels");
        if (res.ok) {
          setSlackOAuthConnected(true);
          // Try to get channel info from integration
        }
      } catch {
        // Not connected
      }
    }

    fetchPrefs();
    checkSlackOAuth();
  }, []);

  async function updatePref(key: string, value: boolean | string | null) {
    // Optimistic update: apply immediately before API call
    const previousPrefs = prefs ? { ...prefs } : null;
    if (prefs) {
      setPrefs({ ...prefs, [key]: value } as Preferences);
    }

    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrefs(data.preferences);
      } else {
        // Revert on failure
        setPrefs(previousPrefs);
      }
    } catch (err) {
      console.error("Failed to update preference:", err);
      // Revert on error
      setPrefs(previousPrefs);
    }
  }

  async function testSlack() {
    if (!slackUrl) return;
    setTestingSlack(true);
    try {
      // Save the URL first
      await updatePref("slack_webhook_url", slackUrl);
      // Send a test message
      await fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "✅ Korva notification test successful! You'll receive alerts here.",
        }),
      });
    } catch {
      // Slack test may fail due to CORS, but the webhook may still work server-side
    } finally {
      setTestingSlack(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Email Notifications</h3>
        </div>
        <div className="space-y-3">
          <ToggleRow
            label="Email notifications"
            description="Receive all notifications via email"
            enabled={prefs.email_enabled}
            onChange={(v) => updatePref("email_enabled", v)}
            saving={saving}
          />
        </div>
      </div>

      {/* Notification Types */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Alert Types</h3>
        </div>
        <div className="space-y-3">
          <ToggleRow
            label="Weekly digest"
            description="Receive a weekly summary of your store performance"
            enabled={prefs.weekly_report}
            onChange={(v) => updatePref("weekly_report", v)}
            saving={saving}
          />
          <ToggleRow
            label="Anomaly alerts"
            description="Get notified when unusual patterns are detected in your metrics"
            enabled={prefs.anomaly_alerts}
            onChange={(v) => updatePref("anomaly_alerts", v)}
            saving={saving}
          />
          <ToggleRow
            label="Inventory alerts"
            description="Get notified when products are running low on stock"
            enabled={prefs.inventory_alerts}
            onChange={(v) => updatePref("inventory_alerts", v)}
            saving={saving}
          />
        </div>
      </div>

      {/* Slack Integration */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Slack Integration</h3>
        </div>

        {slackOAuthConnected ? (
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Slack Connected via OAuth
                  </p>
                  <p className="text-xs text-muted">
                    {slackChannelName
                      ? `Posting to #${slackChannelName}`
                      : "Configure channel in Integrations settings"}
                  </p>
                </div>
              </div>
              <ToggleRow
                label=""
                description=""
                enabled={prefs.slack_enabled}
                onChange={(v) => updatePref("slack_enabled", v)}
                saving={saving}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-background p-4 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Connect Slack
                  </p>
                  <p className="text-xs text-muted">
                    Connect via OAuth for channel selection and richer notifications
                  </p>
                </div>
                <a
                  href="/api/connectors/slack/install"
                  className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Connect Slack
                </a>
              </div>
            </div>

            <p className="text-xs text-muted mb-2">
              Or use a legacy webhook URL:
            </p>
            <ToggleRow
              label="Slack webhook notifications"
              description="Send alerts to a Slack channel via incoming webhook"
              enabled={prefs.slack_enabled}
              onChange={(v) => updatePref("slack_enabled", v)}
              saving={saving}
            />
            {prefs.slack_enabled && (
              <div className="mt-3 ml-11 space-y-2">
                <input
                  type="text"
                  value={slackUrl}
                  onChange={(e) => setSlackUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => updatePref("slack_webhook_url", slackUrl)}
                    disabled={saving}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                  >
                    Save URL
                  </button>
                  <button
                    onClick={testSlack}
                    disabled={testingSlack || !slackUrl}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background disabled:opacity-50"
                  >
                    {testingSlack ? "Sending..." : "Test"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onChange,
  saving,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background p-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        disabled={saving}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
          enabled ? "bg-primary" : "bg-zinc-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
