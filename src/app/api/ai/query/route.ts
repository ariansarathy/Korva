import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { checkAiQueryLimit, incrementAiQueryUsage } from "@/lib/utils/plan-limits";
import { generateSQL, interpretResults } from "@/lib/ai/claude";
import { sandboxQuery } from "@/lib/ai/sql-sandbox";
import { AiQuerySchema } from "@/lib/validation/schemas";
import { logger } from "@/lib/logging/logger";
import { logAudit } from "@/lib/audit";
import { isDemoMode, getDemoAIResponse } from "@/lib/demo";

/**
 * POST /api/ai/query
 * Body: { question: string, conversation_id?: string }
 * Processes natural language questions into SQL, executes, and returns interpreted results.
 * Supports multi-turn conversations with optional conversation_id.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Demo mode — return mock AI response
  if (isDemoMode()) {
    try {
      const body = await request.json();
      const question = body.question ?? "";
      const response = getDemoAIResponse(question);
      return NextResponse.json({
        sql: response.sql,
        explanation: "Demo query executed successfully",
        interpretation: response.interpretation,
        chart_type: response.chart_type,
        chart_config: response.chart_config,
        data: response.data,
        execution_time_ms: 42 + Math.floor(Math.random() * 80),
        tokens_used: 340 + Math.floor(Math.random() * 200),
        conversation_id: "demo-conv-001",
      });
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
  }

  try {
    // Authenticate
    const { userId, store } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!store) {
      return NextResponse.json(
        { error: "No store connected. Please connect a store first." },
        { status: 400 }
      );
    }

    // Check limits
    const limitCheck = await checkAiQueryLimit(userId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `AI query limit reached (${limitCheck.used}/${limitCheck.limit}). Upgrade your plan for more queries.`,
          limitReached: true,
          used: limitCheck.used,
          limit: limitCheck.limit,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = AiQuerySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { question, conversation_id } = parsed.data;

    const supabase = await createClient();
    let activeConversationId = conversation_id;

    // Fetch conversation history for multi-turn context
    let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];

    if (activeConversationId) {
      const { data: messages } = await supabase
        .from("ai_conversation_messages")
        .select("role, content")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (messages && messages.length > 0) {
        conversationHistory = messages.reverse().map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
      }
    } else {
      // Auto-create conversation
      const { data: newConv } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: userId,
          store_id: store.id,
          title: question.trim().slice(0, 100),
        })
        .select("id")
        .single();

      if (newConv) {
        activeConversationId = newConv.id;
      }
    }

    // Step 1: Generate SQL from question (with conversation history)
    const { result: sqlResult, tokensUsed: sqlTokens } = await generateSQL(
      question.trim(),
      conversationHistory
    );

    // Step 2: Execute the query in sandbox
    let queryResult;
    try {
      queryResult = await sandboxQuery(sqlResult.sql, store.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Query execution failed";
      return NextResponse.json(
        {
          error: `Failed to execute query: ${errorMessage}`,
          sql: sqlResult.sql,
          explanation: sqlResult.explanation,
          conversation_id: activeConversationId,
        },
        { status: 400 }
      );
    }

    // Step 3: Interpret results
    const { interpretation, tokensUsed: interpretTokens } = await interpretResults(
      question,
      sqlResult.sql,
      queryResult.rows as Record<string, unknown>[],
      sqlResult.chart_type
    );

    const totalTokens = sqlTokens + interpretTokens;
    const executionTimeMs = Date.now() - startTime;

    // Save user message
    if (activeConversationId) {
      await supabase.from("ai_conversation_messages").insert({
        conversation_id: activeConversationId,
        role: "user",
        content: question.trim(),
      });

      // Save assistant message
      await supabase.from("ai_conversation_messages").insert({
        conversation_id: activeConversationId,
        role: "assistant",
        content: interpretation,
        generated_sql: sqlResult.sql,
        chart_type: sqlResult.chart_type,
        chart_config: sqlResult.chart_config,
        data: queryResult.rows,
        tokens_used: totalTokens,
        execution_time_ms: executionTimeMs,
      });

      // Update conversation title if it was auto-created (first message)
      if (!conversation_id) {
        await supabase
          .from("ai_conversations")
          .update({
            title: question.trim().slice(0, 100),
            updated_at: new Date().toISOString(),
          })
          .eq("id", activeConversationId);
      } else {
        await supabase
          .from("ai_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", activeConversationId);
      }
    }

    // Log the query
    await supabase.from("ai_queries").insert({
      user_id: userId,
      store_id: store.id,
      question: question.trim(),
      generated_sql: sqlResult.sql,
      response: interpretation,
      chart_type: sqlResult.chart_type,
      tokens_used: totalTokens,
      execution_time_ms: executionTimeMs,
      conversation_id: activeConversationId ?? null,
    });

    // Increment usage
    await incrementAiQueryUsage(userId);

    logger.info("AI query completed", {
      userId: userId ?? undefined,
      storeId: store.id,
      durationMs: executionTimeMs,
      tokensUsed: totalTokens,
      path: "/api/ai/query",
    });

    logAudit(userId!, store.id, "ai_query", "conversation", activeConversationId ?? undefined, {
      tokensUsed: totalTokens,
      executionTimeMs,
    }, request);

    return NextResponse.json({
      question: question.trim(),
      sql: sqlResult.sql,
      explanation: sqlResult.explanation,
      interpretation,
      chart_type: sqlResult.chart_type,
      chart_config: sqlResult.chart_config,
      data: queryResult.rows,
      row_count: queryResult.rowCount,
      tokens_used: totalTokens,
      execution_time_ms: executionTimeMs,
      conversation_id: activeConversationId,
    });
  } catch (error) {
    logger.error("AI query failed", { error, path: "/api/ai/query" });
    return NextResponse.json(
      { error: "Failed to process your question. Please try again." },
      { status: 500 }
    );
  }
}
