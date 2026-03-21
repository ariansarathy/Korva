import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/health
 * Health check endpoint for monitoring and uptime services.
 * Checks database connectivity and returns system status.
 */
export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: "ok" | "error"; latencyMs?: number; error?: string }> = {};

  // Check database connectivity
  try {
    const dbStart = Date.now();
    const supabase = createAdminClient();
    const { error } = await supabase.from("stores").select("id", { count: "exact", head: true });

    if (error) {
      checks.database = { status: "error", latencyMs: Date.now() - dbStart, error: error.message };
    } else {
      checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
    }
  } catch (err) {
    checks.database = {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown database error",
    };
  }

  const overallStatus = Object.values(checks).every((c) => c.status === "ok") ? "healthy" : "degraded";
  const statusCode = overallStatus === "healthy" ? 200 : 503;

  return NextResponse.json(
    {
      status: overallStatus,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
      checks,
    },
    { status: statusCode }
  );
}
