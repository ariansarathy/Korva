"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { ReportType, ScheduleFrequency } from "@/lib/supabase/types";

interface ScheduleModalProps {
  onClose: () => void;
  onSave: (schedule: {
    report_type: ReportType;
    schedule: ScheduleFrequency;
    day_of_week: number | null;
    day_of_month: number | null;
    recipients: string[];
  }) => Promise<void>;
  existing?: {
    id: string;
    report_type: ReportType;
    schedule: ScheduleFrequency;
    day_of_week: number | null;
    day_of_month: number | null;
    recipients: string[];
  };
}

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "weekly_performance", label: "Weekly Performance Summary" },
  { value: "monthly_deep_dive", label: "Monthly Deep Dive" },
  { value: "product_performance", label: "Product Performance" },
  { value: "customer_insights", label: "Customer Insights" },
];

const FREQUENCIES: { value: ScheduleFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

export function ScheduleModal({ onClose, onSave, existing }: ScheduleModalProps) {
  const [reportType, setReportType] = useState<ReportType>(
    existing?.report_type || "weekly_performance"
  );
  const [frequency, setFrequency] = useState<ScheduleFrequency>(
    existing?.schedule || "weekly"
  );
  const [dayOfWeek, setDayOfWeek] = useState<number>(
    existing?.day_of_week ?? 1
  );
  const [dayOfMonth, setDayOfMonth] = useState<number>(
    existing?.day_of_month ?? 1
  );
  const [recipientsInput, setRecipientsInput] = useState(
    existing?.recipients?.join(", ") || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const recipients = recipientsInput
      .split(",")
      .map((r) => r.trim())
      .filter((r) => r.includes("@"));

    if (recipients.length === 0) {
      setError("Please enter at least one valid email address.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSave({
        report_type: reportType,
        schedule: frequency,
        day_of_week: frequency === "weekly" ? dayOfWeek : null,
        day_of_month: frequency === "monthly" ? dayOfMonth : null,
        recipients,
      });
      onClose();
    } catch {
      setError("Failed to save schedule. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">
            {existing ? "Edit Schedule" : "New Report Schedule"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 px-6 py-5">
          {/* Report Type */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {REPORT_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">
              Frequency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFrequency(f.value)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    frequency === f.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted hover:border-primary/50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Day of Week */}
          {frequency === "weekly" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">
                Day of Week
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Day of Month */}
          {frequency === "monthly" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">
                Day of Month
              </label>
              <select
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Recipients */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">
              Recipients (comma-separated emails)
            </label>
            <input
              type="text"
              value={recipientsInput}
              onChange={(e) => setRecipientsInput(e.target.value)}
              placeholder="you@example.com, team@example.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {existing ? "Update Schedule" : "Create Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
