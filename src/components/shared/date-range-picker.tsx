"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

interface DateRangePickerProps {
  value: string;
  onChange: (period: string, customRange?: { from: string; to: string }) => void;
}

const presets = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "12mo", value: "12mo" },
  { label: "Custom", value: "custom" },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(value === "custom");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const handlePresetClick = (preset: string) => {
    if (preset === "custom") {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onChange(preset);
    }
  };

  const handleApplyCustom = () => {
    if (fromDate && toDate) {
      onChange("custom", { from: fromDate, to: toDate });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => (
        <button
          key={preset.value}
          onClick={() => handlePresetClick(preset.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            value === preset.value || (preset.value === "custom" && showCustom)
              ? "bg-primary text-white"
              : "bg-surface-hover text-muted hover:text-foreground"
          }`}
        >
          {preset.label}
        </button>
      ))}

      {showCustom && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background pl-7 pr-2 text-xs text-foreground"
            />
          </div>
          <span className="text-xs text-muted">to</span>
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background pl-7 pr-2 text-xs text-foreground"
            />
          </div>
          <button
            onClick={handleApplyCustom}
            disabled={!fromDate || !toDate}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
