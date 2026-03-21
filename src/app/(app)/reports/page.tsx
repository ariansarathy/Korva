"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Clock,
  Plus,
  Calendar,
  Loader2,
  CalendarClock,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { ReportCard } from "@/components/reports/report-card";
import { ReportViewer } from "@/components/reports/report-viewer";
import { ScheduleModal } from "@/components/reports/schedule-modal";
import type { ReportType, ReportStatus, ScheduleFrequency } from "@/lib/supabase/types";

interface ReportSummary {
  id: string;
  type: ReportType;
  title: string;
  status: ReportStatus;
  generated_at: string | null;
  created_at: string;
}

interface ReportFull {
  id: string;
  type: ReportType;
  title: string;
  status: ReportStatus;
  data: Record<string, unknown>;
  generated_at: string | null;
}

interface Schedule {
  id: string;
  report_type: ReportType;
  schedule: ScheduleFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  recipients: string[];
  enabled: boolean;
  next_send_at: string | null;
  last_sent_at: string | null;
}

const REPORT_TYPES: {
  type: ReportType;
  title: string;
  description: string;
  schedule: string;
  icon: typeof Calendar;
}[] = [
  {
    type: "weekly_performance",
    title: "Weekly Performance Summary",
    description: "Overview of revenue, orders, and key metrics from the past week.",
    schedule: "Every Monday",
    icon: Calendar,
  },
  {
    type: "monthly_deep_dive",
    title: "Monthly Deep Dive",
    description: "Comprehensive analysis of trends, growth, and opportunities.",
    schedule: "1st of each month",
    icon: FileText,
  },
  {
    type: "product_performance",
    title: "Product Performance",
    description: "Sales velocity, margin analysis, and inventory forecasts.",
    schedule: "On demand",
    icon: FileText,
  },
  {
    type: "customer_insights",
    title: "Customer Insights",
    description: "Segmentation, retention cohorts, and lifetime value analysis.",
    schedule: "On demand",
    icon: FileText,
  },
];

const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<ReportType | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<ReportFull | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [reportsRes, schedulesRes] = await Promise.all([
        fetch("/api/reports/list?limit=20"),
        fetch("/api/reports/schedules"),
      ]);

      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.reports);
      }
      if (schedulesRes.ok) {
        const data = await schedulesRes.json();
        setSchedules(data.schedules);
      }
    } catch (err) {
      console.error("Failed to fetch reports data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleGenerate(reportType: ReportType) {
    setGenerating(reportType);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType }),
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("Report generation failed:", err);
    } finally {
      setGenerating(null);
    }
  }

  async function handleView(reportId: string) {
    try {
      const res = await fetch(`/api/reports/${reportId}`);
      if (res.ok) {
        const data = await res.json();
        setViewingReport(data.report);
      }
    } catch (err) {
      console.error("Failed to fetch report:", err);
    }
  }

  async function handleEmail(reportId: string) {
    setSendingId(reportId);
    try {
      await fetch("/api/reports/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
    } catch (err) {
      console.error("Failed to send report:", err);
    } finally {
      setSendingId(null);
    }
  }

  async function handleCreateSchedule(scheduleData: {
    report_type: ReportType;
    schedule: ScheduleFrequency;
    day_of_week: number | null;
    day_of_month: number | null;
    recipients: string[];
  }) {
    const res = await fetch("/api/reports/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scheduleData),
    });

    if (!res.ok) throw new Error("Failed to create schedule");
    await fetchData();
  }

  async function handleToggleSchedule(scheduleId: string, enabled: boolean) {
    try {
      await fetch("/api/reports/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: scheduleId, enabled }),
      });
      await fetchData();
    } catch (err) {
      console.error("Failed to toggle schedule:", err);
    }
  }

  async function handleDeleteSchedule(scheduleId: string) {
    try {
      await fetch("/api/reports/schedules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: scheduleId }),
      });
      await fetchData();
    } catch (err) {
      console.error("Failed to delete schedule:", err);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="mt-1 text-sm text-secondary">
            AI-generated reports delivered to your inbox.
          </p>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <CalendarClock className="h-4 w-4" />
          Schedule Report
        </button>
      </div>

      {/* Generate Report Cards */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Generate Report
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {REPORT_TYPES.map((rt) => {
            const Icon = rt.icon;
            const isGenerating = generating === rt.type;
            return (
              <button
                key={rt.type}
                onClick={() => handleGenerate(rt.type)}
                disabled={generating !== null}
                className="rounded-xl border border-border bg-surface p-5 text-left transition-shadow hover:shadow-md disabled:opacity-60"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    {isGenerating ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <Icon className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {rt.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted">{rt.description}</p>
                    <div className="mt-3 flex items-center gap-1 text-xs text-secondary">
                      <Clock className="h-3 w-3" />
                      {isGenerating ? "Generating..." : rt.schedule}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedules */}
      {schedules.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Active Schedules
          </h2>
          <div className="space-y-2">
            {schedules.map((s) => {
              const typeInfo = REPORT_TYPES.find((rt) => rt.type === s.report_type);
              const freqLabel = FREQUENCY_LABELS[s.schedule] || s.schedule;
              let scheduleDetail = freqLabel;
              if (s.schedule === "weekly" && s.day_of_week !== null) {
                scheduleDetail += ` on ${DAYS_OF_WEEK[s.day_of_week]}`;
              }
              if (s.schedule === "monthly" && s.day_of_month !== null) {
                scheduleDetail += ` on the ${s.day_of_month}${ordinalSuffix(s.day_of_month)}`;
              }

              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex items-center gap-3">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {typeInfo?.title ?? s.report_type}
                      </p>
                      <p className="text-xs text-muted">
                        {scheduleDetail} &middot;{" "}
                        {s.recipients.length} recipient{s.recipients.length !== 1 ? "s" : ""}
                        {s.next_send_at && (
                          <>
                            {" "}&middot; Next:{" "}
                            {new Date(s.next_send_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleSchedule(s.id, !s.enabled)}
                      className="p-1.5 text-muted transition-colors hover:text-foreground"
                      title={s.enabled ? "Pause schedule" : "Resume schedule"}
                    >
                      {s.enabled ? (
                        <ToggleRight className="h-5 w-5 text-primary" />
                      ) : (
                        <ToggleLeft className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(s.id)}
                      className="p-1.5 text-muted transition-colors hover:text-danger"
                      title="Delete schedule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Reports */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Report History
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8">
            <div className="text-center">
              <FileText className="mx-auto h-8 w-8 text-muted" />
              <h3 className="mt-3 text-sm font-medium text-foreground">
                No reports yet
              </h3>
              <p className="mt-1 text-sm text-muted">
                Generate your first report above to see it here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <ReportCard
                key={r.id}
                id={r.id}
                type={r.type}
                title={r.title}
                status={r.status}
                generatedAt={r.generated_at}
                onView={handleView}
                onEmail={handleEmail}
                sendingId={sendingId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Report Viewer Modal */}
      {viewingReport && (
        <ReportViewer
          title={viewingReport.title}
          data={viewingReport.data}
          onClose={() => setViewingReport(null)}
        />
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          onClose={() => setShowScheduleModal(false)}
          onSave={handleCreateSchedule}
        />
      )}
    </div>
  );
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
