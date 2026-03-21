"use client";

import { X } from "lucide-react";

interface ReportViewerProps {
  title: string;
  data: Record<string, unknown>;
  onClose: () => void;
}

export function ReportViewer({ title, data, onClose }: ReportViewerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {Object.entries(data).map(([key, value]) => (
            <ReportSection key={key} sectionKey={key} value={value} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportSection({
  sectionKey,
  value,
}: {
  sectionKey: string;
  value: unknown;
}) {
  const label = sectionKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  if (typeof value === "string") {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">{label}</h3>
        <p className="text-sm leading-relaxed text-muted">{value}</p>
      </div>
    );
  }

  if (Array.isArray(value)) {
    // Array of objects (e.g., top_products with nested fields)
    if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
      return (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">{label}</h3>
          <div className="space-y-2">
            {value.map((item, i) => {
              const obj = item as Record<string, unknown>;
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  {Object.entries(obj).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-muted capitalize">
                        {k.replace(/_/g, " ")}
                      </span>
                      <span className="font-medium text-foreground">
                        {String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Array of strings (e.g., recommendations)
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">{label}</h3>
        <div className="space-y-2">
          {value.map((item, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-lg border-l-2 border-primary bg-primary/5 p-3"
            >
              <span className="text-xs font-bold text-primary">{i + 1}.</span>
              <p className="text-sm text-foreground">{String(item)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">{label}</h3>
        <div className="space-y-3 rounded-lg border border-border bg-background p-4">
          {Object.entries(obj).map(([k, v]) => {
            const subLabel = k
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());

            if (typeof v === "string") {
              return (
                <div key={k}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {subLabel}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {v}
                  </p>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  }

  return null;
}
