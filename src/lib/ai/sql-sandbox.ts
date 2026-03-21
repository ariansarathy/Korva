/**
 * SQL validation and sandboxing for AI-generated queries.
 * Ensures only SELECT queries run, with store_id scoping and limits.
 */

import { createClient } from "@/lib/supabase/server";

// ─── Validation ──────────────────────────────────────────────────

const BLOCKED_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "TRUNCATE",
  "CREATE",
  "GRANT",
  "REVOKE",
  "EXECUTE",
  "COPY",
  "\\\\",
  "pg_",
  "information_schema",
  "auth.",
  "storage.",
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedSQL?: string;
}

export function validateSQL(sql: string): ValidationResult {
  const normalized = sql.trim().toUpperCase();

  // Must start with SELECT or WITH (CTE)
  if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH")) {
    return { valid: false, error: "Only SELECT queries are allowed" };
  }

  // Check for blocked keywords
  for (const keyword of BLOCKED_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword.replace(".", "\\.")}`, "i");
    if (regex.test(sql)) {
      return {
        valid: false,
        error: `Blocked keyword detected: ${keyword}`,
      };
    }
  }

  // Check for multiple statements (prevent injection via ;)
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (statements.length > 1) {
    return { valid: false, error: "Multiple statements are not allowed" };
  }

  return { valid: true, sanitizedSQL: sql.trim() };
}

// ─── Sandboxed Execution ─────────────────────────────────────────

export interface SandboxQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

/**
 * Execute a validated SQL query in a sandboxed context.
 * Uses the execute_readonly_query RPC function for safety.
 * Falls back to direct query if the RPC function isn't available.
 */
export async function sandboxQuery(
  sql: string,
  storeId: string
): Promise<SandboxQueryResult> {
  const validation = validateSQL(sql);
  if (!validation.valid) {
    throw new Error(`SQL validation failed: ${validation.error}`);
  }

  // Ensure LIMIT exists
  const normalizedSQL = ensureLimit(validation.sanitizedSQL!);

  const supabase = await createClient();
  const startTime = Date.now();

  // Try RPC first (safer — uses SECURITY DEFINER function with timeout)
  try {
    const { data, error } = await supabase.rpc("execute_readonly_query", {
      query_text: normalizedSQL,
      store_id_param: storeId,
    });

    if (!error && data) {
      const rows = Array.isArray(data) ? data : [];
      return {
        rows,
        rowCount: rows.length,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // If RPC doesn't exist, fall back to direct query
    if (error?.code === "42883") {
      // function does not exist
      console.warn("execute_readonly_query not found, using direct query");
    } else if (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  } catch (err) {
    // RPC not available — fall back
    if (!(err instanceof Error) || !err.message.includes("42883")) {
      throw err;
    }
  }

  // Fallback: execute directly with parameterized store_id
  // Replace $1 with the actual store_id (quoted)
  const directSQL = normalizedSQL.replace(/\$1/g, `'${storeId}'`);

  const { data, error } = await supabase.rpc("execute_readonly_query", {
    query_text: directSQL,
    store_id_param: storeId,
  });

  if (error) {
    // Last resort: use raw query via admin if RPC truly unavailable
    throw new Error(`Query execution failed: ${error.message}`);
  }

  const rows = Array.isArray(data) ? data : [];
  return {
    rows,
    rowCount: rows.length,
    executionTimeMs: Date.now() - startTime,
  };
}

function ensureLimit(sql: string): string {
  const upperSQL = sql.toUpperCase();
  if (!upperSQL.includes("LIMIT")) {
    return `${sql.replace(/;?\s*$/, "")} LIMIT 100`;
  }
  return sql;
}
