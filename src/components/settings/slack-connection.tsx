"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Send,
  Hash,
} from "lucide-react";

interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
}

interface SlackConfig {
  team_name?: string;
  channel_id?: string;
  channel_name?: string;
}

interface SlackConnectionInfo {
  connected: boolean;
  accountName: string;
  config: SlackConfig;
}

export function SlackConnection() {
  const [info, setInfo] = useState<SlackConnectionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [savingChannel, setSavingChannel] = useState(false);
  const [testingSend, setTestingSend] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/connectors/slack/channels");
      if (res.ok) {
        const data = await res.json();
        setInfo({
          connected: true,
          accountName: "Slack",
          config: {},
        });
        setChannels(data.channels ?? []);
      } else if (res.status === 404) {
        setInfo(null);
      }
    } catch {
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetChannel() {
    if (!selectedChannel) return;
    setSavingChannel(true);
    setMessage("");

    const channel = channels.find((c) => c.id === selectedChannel);
    try {
      const res = await fetch("/api/connectors/slack/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedChannel,
          channelName: channel?.name ?? "",
        }),
      });

      if (res.ok) {
        setMessage("Channel saved!");
        if (info) {
          setInfo({
            ...info,
            config: {
              ...info.config,
              channel_id: selectedChannel,
              channel_name: channel?.name,
            },
          });
        }
      }
    } catch {
      setMessage("Failed to save channel");
    } finally {
      setSavingChannel(false);
    }
  }

  async function handleTestMessage() {
    setTestingSend(true);
    setMessage("");
    try {
      // We'll use a simple test endpoint — or the notification API
      const res = await fetch("/api/connectors/slack/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: info?.config?.channel_id ?? selectedChannel,
          channelName: info?.config?.channel_name ?? "",
          test: true,
        }),
      });

      if (res.ok) {
        setMessage("Test message sent!");
      } else {
        setMessage("Failed to send test message");
      }
    } catch {
      setMessage("Failed to send test message");
    } finally {
      setTestingSend(false);
    }
  }

  function handleConnect() {
    window.location.href = "/api/connectors/slack/install";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  return (
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
        {info?.connected ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Connected
          </span>
        ) : (
          <button
            onClick={handleConnect}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Connect
          </button>
        )}
      </div>

      {info?.connected && (
        <div className="mt-4 space-y-3">
          {/* Channel selector */}
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted" />
            <select
              value={selectedChannel || info.config?.channel_id || ""}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select a channel...</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.isPrivate ? "🔒 " : "#"} {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleSetChannel}
              disabled={savingChannel || !selectedChannel}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {savingChannel ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Save"
              )}
            </button>
          </div>

          {/* Test message button */}
          {(info.config?.channel_id || selectedChannel) && (
            <button
              onClick={handleTestMessage}
              disabled={testingSend}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              {testingSend ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              Send Test Message
            </button>
          )}

          {message && (
            <p className="text-xs text-muted">{message}</p>
          )}
        </div>
      )}
    </div>
  );
}
