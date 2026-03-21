"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Webhook,
  Plus,
  Loader2,
  Check,
  Copy,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

const availableEvents = [
  "order.created",
  "order.updated",
  "product.created",
  "product.updated",
  "customer.created",
  "customer.updated",
  "insight.generated",
];

export function WebhookSettings() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>([
    "order.created",
    "order.updated",
  ]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(
    new Set()
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/webhooks/manage");
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  async function handleCreate() {
    if (!newUrl.trim()) {
      setCreateError("Webhook URL is required");
      return;
    }

    try {
      new URL(newUrl);
    } catch {
      setCreateError("Invalid URL format");
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/webhooks/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newUrl.trim(),
          events: newEvents,
          enabled: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.error || "Failed to create webhook");
        return;
      }

      setNewUrl("");
      setNewEvents(["order.created", "order.updated"]);
      setShowCreate(false);
      fetchWebhooks();
    } catch {
      setCreateError("Failed to create webhook. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(webhook: WebhookConfig) {
    try {
      await fetch("/api/webhooks/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          enabled: !webhook.enabled,
        }),
      });
      fetchWebhooks();
    } catch {
      // Silently fail
    }
  }

  function toggleSecret(id: string) {
    setRevealedSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function copySecret(id: string, secret: string) {
    navigator.clipboard.writeText(secret);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function maskSecret(secret: string): string {
    if (secret.length <= 12) return "••••••••••••";
    return secret.slice(0, 8) + "••••••••" + secret.slice(-4);
  }

  function toggleEvent(event: string) {
    setNewEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Configure webhook endpoints to receive real-time event notifications.
        </p>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Endpoint
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Endpoint URL
            </label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value);
                setCreateError("");
              }}
              placeholder="https://your-app.com/webhooks/korva"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Events to subscribe
            </label>
            <div className="flex flex-wrap gap-2">
              {availableEvents.map((event) => (
                <button
                  key={event}
                  onClick={() => toggleEvent(event)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    newEvents.includes(event)
                      ? "bg-primary text-white"
                      : "border border-border bg-background text-muted hover:border-primary hover:text-foreground"
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
          </div>

          {createError && (
            <p className="text-xs text-danger">{createError}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Endpoint
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setCreateError("");
              }}
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Webhook list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      ) : webhooks.length === 0 && !showCreate ? (
        <div className="rounded-xl border border-border bg-surface py-12 text-center">
          <Webhook className="mx-auto h-8 w-8 text-muted/50" />
          <p className="mt-2 text-sm text-muted">
            No webhook endpoints configured.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-3 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
          >
            Create your first endpoint
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  {/* URL */}
                  <p className="text-sm font-medium text-foreground truncate">
                    {webhook.url}
                  </p>

                  {/* Events */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-medium text-muted"
                      >
                        {event}
                      </span>
                    ))}
                  </div>

                  {/* Secret */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-muted">Secret:</span>
                    <code className="text-xs text-foreground font-mono">
                      {revealedSecrets.has(webhook.id)
                        ? webhook.secret
                        : maskSecret(webhook.secret)}
                    </code>
                    <button
                      onClick={() => toggleSecret(webhook.id)}
                      className="p-0.5 text-muted hover:text-foreground transition-colors"
                      title={
                        revealedSecrets.has(webhook.id) ? "Hide" : "Reveal"
                      }
                    >
                      {revealedSecrets.has(webhook.id) ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      onClick={() => copySecret(webhook.id, webhook.secret)}
                      className="p-0.5 text-muted hover:text-foreground transition-colors"
                      title="Copy secret"
                    >
                      {copiedId === webhook.id ? (
                        <Check className="h-3 w-3 text-success" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Toggle + status */}
                <div className="ml-4 flex items-center gap-3">
                  <span
                    className={`text-xs font-medium ${
                      webhook.enabled ? "text-success" : "text-muted"
                    }`}
                  >
                    {webhook.enabled ? "Active" : "Disabled"}
                  </span>
                  <button
                    onClick={() => handleToggle(webhook)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      webhook.enabled ? "bg-success" : "bg-border"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        webhook.enabled ? "translate-x-4" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Created date */}
              <p className="mt-2 text-[10px] text-muted">
                Created{" "}
                {new Date(webhook.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
