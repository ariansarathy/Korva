"use client";

import { useState, useEffect } from "react";
import { Loader2, Key, Plus, Copy, Check, Trash2, AlertCircle } from "lucide-react";

interface ApiKeyEntry {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

const AVAILABLE_SCOPES = [
  { value: "orders:read", label: "Orders (Read)" },
  { value: "products:read", label: "Products (Read)" },
  { value: "customers:read", label: "Customers (Read)" },
  { value: "analytics:read", label: "Analytics (Read)" },
  { value: "reports:read", label: "Reports (Read)" },
];

export function ApiKeys() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["orders:read", "products:read", "analytics:read"]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    try {
      const res = await fetch("/api/keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys ?? []);
      }
    } catch (err) {
      console.error("Failed to load API keys:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newKeyName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: newKeyScopes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedKey(data.key);
        setNewKeyName("");
        setShowCreateForm(false);
        await fetchKeys();
      }
    } catch (err) {
      console.error("Failed to create API key:", err);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    setRevoking(keyId);
    try {
      await fetch(`/api/keys?keyId=${keyId}`, { method: "DELETE" });
      await fetchKeys();
    } catch (err) {
      console.error("Failed to revoke key:", err);
    } finally {
      setRevoking(null);
    }
  }

  function handleCopy() {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function toggleScope(scope: string) {
    setNewKeyScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
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
      {/* Newly created key banner */}
      {createdKey && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                Copy your API key now
              </p>
              <p className="mt-1 text-xs text-amber-700">
                This key will only be shown once. Store it securely.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded border border-amber-200 bg-white px-3 py-2 text-xs font-mono text-amber-900">
                  {createdKey}
                </code>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
                >
                  {copied ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                onClick={() => setCreatedKey(null)}
                className="mt-2 text-xs text-amber-600 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key list */}
      {keys.length > 0 && (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <Key className="h-4 w-4 text-muted" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {key.name}
                  </p>
                  <p className="text-xs text-muted">
                    <code>{key.key_prefix}...</code>
                    {key.last_used_at
                      ? ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`
                      : " · Never used"}
                    {" · "}
                    {key.scopes.length} scope{key.scopes.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRevoke(key.id)}
                disabled={revoking === key.id}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/5 disabled:opacity-50"
              >
                {revoking === key.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {keys.length === 0 && !showCreateForm && (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <Key className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-2 text-sm text-muted">
            No API keys created yet. Create one to access the Korva REST API.
          </p>
        </div>
      )}

      {/* Create form */}
      {showCreateForm ? (
        <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Key name (e.g. Production, Development)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <div>
            <p className="text-xs font-medium text-muted mb-2">Scopes</p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SCOPES.map((scope) => (
                <button
                  key={scope.value}
                  onClick={() => toggleScope(scope.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    newKeyScopes.includes(scope.value)
                      ? "bg-primary text-white"
                      : "border border-border text-muted hover:text-foreground"
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !newKeyName.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Create Key
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          <Plus className="h-4 w-4" />
          Create API Key
        </button>
      )}
    </div>
  );
}
