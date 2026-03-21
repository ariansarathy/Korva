import { z } from "zod";

/**
 * Sanitize a string for safe use in Supabase PostgREST .or() / .ilike() filters.
 * Strips characters that could break or inject into PostgREST filter syntax.
 */
function sanitizeSearchInput(input: string): string {
  // Remove PostgREST filter operators and dangerous characters
  return input
    .replace(/[%_\\]/g, "") // SQL wildcards and escape
    .replace(/[(),.]/g, "") // PostgREST syntax chars
    .replace(/[<>'"`;]/g, "") // SQL/XSS chars
    .trim()
    .slice(0, 200); // Limit length
}

// ─── Search / Pagination ──────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CustomerSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z
    .string()
    .optional()
    .default("")
    .transform(sanitizeSearchInput),
  segment: z.string().optional().default(""),
});

export const ProductSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z
    .string()
    .optional()
    .default("")
    .transform(sanitizeSearchInput),
  status: z.string().optional().default(""),
});

// ─── AI Query ─────────────────────────────────────────────────────

export const AiQuerySchema = z.object({
  question: z
    .string()
    .min(3, "Please ask a question (at least 3 characters)")
    .max(2000, "Question is too long (max 2000 characters)")
    .transform((s) => s.trim()),
  conversation_id: z.string().uuid().optional(),
});

// ─── Team Invite ──────────────────────────────────────────────────

export const TeamInviteSchema = z.object({
  email: z
    .string()
    .max(255)
    .transform((s) => s.trim().toLowerCase())
    .pipe(z.string().email("Valid email address is required.")),
  role: z.enum(["admin", "member", "viewer"]),
});

// ─── Report Generation ───────────────────────────────────────────

export const ReportGenerateSchema = z.object({
  type: z.enum(["summary", "detailed", "executive", "custom"]),
  period: z.string().optional().default("30d"),
  sections: z.array(z.string()).optional(),
  format: z.enum(["pdf", "email", "both"]).optional().default("email"),
});

// ─── Store Connection ─────────────────────────────────────────────

export const StoreConnectSchema = z.object({
  platform: z.enum(["shopify", "woocommerce", "amazon"]),
  domain: z
    .string()
    .min(1, "Store domain is required")
    .max(255)
    .transform((s) => s.trim().toLowerCase()),
  access_token: z.string().min(1).optional(),
});

// ─── Helper ───────────────────────────────────────────────────────

/**
 * Parse search params from a URL into an object for Zod validation.
 */
export function searchParamsToObject(
  searchParams: URLSearchParams
): Record<string, string> {
  const obj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

// Re-export sanitize for testing
export { sanitizeSearchInput };
