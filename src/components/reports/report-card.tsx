"use client";

import { FileText, Mail, Eye, Loader2, Clock } from "lucide-react";
import type { ReportType, ReportStatus } from "@/lib/supabase/types";

interface ReportCardProps {
  id: string;
  type: ReportType;
  title: string;
  status: ReportStatus;
  generatedAt: string | null;
  onView: (id: string) => void;
  onEmail: (id: string) => void;
  sendingId: string | null;
}

const STATUS_STYLES: Record<ReportStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
  generating: { label: "Generating", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
};

export function ReportCard({
  id,
  title,
  status,
  generatedAt,
  onView,
  onEmail,
  sendingId,
}: ReportCardProps) {
  const statusInfo = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  const isSending = sendingId === id;

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.className}`}
            >
              {status === "generating" && (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              )}
              {statusInfo.label}
            </span>
            {generatedAt && (
              <span className="flex items-center gap-1 text-xs text-muted">
                <Clock className="h-3 w-3" />
                {new Date(generatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {status === "completed" && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onView(id)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
          <button
            onClick={() => onEmail(id)}
            disabled={isSending}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            Email
          </button>
        </div>
      )}
    </div>
  );
}
