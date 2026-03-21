"use client";

import { useState } from "react";
import { Download, Loader2, AlertTriangle } from "lucide-react";

export function DataExport() {
  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/data/export", { method: "POST" });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `korva-export-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Export Data */}
      <div className="rounded-xl border border-border bg-background p-5">
        <h3 className="text-sm font-semibold text-foreground">Export Data</h3>
        <p className="mt-1 text-xs text-muted">
          Download all your store data as a CSV file. Includes orders, products,
          and customers.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? "Preparing export..." : "Request Export"}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-danger" />
          <h3 className="text-sm font-semibold text-danger">Danger Zone</h3>
        </div>
        <p className="mt-2 text-xs text-muted">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-4 rounded-lg border border-danger px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger hover:text-white"
          >
            Delete Account
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-medium text-danger">
              Are you sure? This will permanently delete all your data including
              stores, orders, reports, and analytics.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
                onClick={() => {
                  // In production, this would call a delete API
                  alert("Account deletion would be processed here.");
                  setShowDeleteConfirm(false);
                }}
              >
                Yes, Delete Everything
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
