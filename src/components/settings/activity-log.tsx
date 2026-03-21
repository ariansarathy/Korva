"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
} from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

const actionLabels: Record<string, string> = {
  ai_query: "AI Query",
  team_invite: "Team Invite",
  data_export: "Data Export",
  api_key_create: "API Key Created",
  api_key_revoke: "API Key Revoked",
  store_switch: "Store Switched",
  login: "Login",
  logout: "Logout",
};

const actionColors: Record<string, string> = {
  ai_query: "bg-primary/10 text-primary",
  team_invite: "bg-success/10 text-success",
  data_export: "bg-warning/10 text-warning",
  api_key_create: "bg-primary/10 text-primary",
  api_key_revoke: "bg-danger/10 text-danger",
  store_switch: "bg-primary/10 text-primary",
};

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const limit = 15;

  const fetchLog = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (actionFilter) params.set("action", actionFilter);

      const res = await fetch(`/api/audit-log?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const uniqueActions = [
    "ai_query",
    "team_invite",
    "data_export",
    "api_key_create",
    "api_key_revoke",
    "store_switch",
  ];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Filter className="h-3.5 w-3.5" />
          Action:
        </div>
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All actions</option>
          {uniqueActions.map((action) => (
            <option key={action} value={action}>
              {actionLabels[action] ?? action}
            </option>
          ))}
        </select>
      </div>

      {/* Log entries */}
      <div className="rounded-xl border border-border bg-surface">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center">
            <ScrollText className="mx-auto h-8 w-8 text-muted/50" />
            <p className="mt-2 text-sm text-muted">No activity recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-4 px-5 py-3 transition-colors hover:bg-surface-hover"
              >
                {/* Action badge */}
                <span
                  className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    actionColors[entry.action] ?? "bg-muted/10 text-muted"
                  }`}
                >
                  {actionLabels[entry.action] ?? entry.action}
                </span>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    {entry.entity_type && (
                      <span className="text-sm text-foreground">
                        {entry.entity_type}
                        {entry.entity_id && (
                          <span className="ml-1 text-muted">
                            #{entry.entity_id.slice(0, 8)}
                          </span>
                        )}
                      </span>
                    )}
                    {entry.metadata &&
                      Object.keys(entry.metadata).length > 0 && (
                        <span className="truncate text-xs text-muted">
                          {JSON.stringify(entry.metadata).slice(0, 60)}
                          {JSON.stringify(entry.metadata).length > 60
                            ? "..."
                            : ""}
                        </span>
                      )}
                  </div>
                </div>

                {/* Timestamp + IP */}
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted">
                    {formatTimestamp(entry.created_at)}
                  </p>
                  {entry.ip_address && (
                    <p className="text-[10px] text-muted/70">
                      {entry.ip_address}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-muted">
              Page {page} of {totalPages} ({total} entries)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
