import Anthropic from "@anthropic-ai/sdk";
import { NL_TO_SQL_SYSTEM_PROMPT, RESULTS_INTERPRETER_SYSTEM_PROMPT } from "./prompts";

let clientInstance: Anthropic | null = null;

function getClient(): Anthropic {
  if (!clientInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Missing ANTHROPIC_API_KEY environment variable");
    }
    clientInstance = new Anthropic({ apiKey });
  }
  return clientInstance;
}

// ─── Types ───────────────────────────────────────────────────────

export interface SQLGenerationResult {
  sql: string;
  explanation: string;
  chart_type: "bar" | "line" | "pie" | "table" | "number";
  chart_config: {
    x_axis?: string;
    y_axis?: string;
    label?: string;
  };
}

export interface InterpretationResult {
  interpretation: string;
  tokensUsed: number;
}

// ─── SQL Generation ──────────────────────────────────────────────

export async function generateSQL(
  question: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<{
  result: SQLGenerationResult;
  tokensUsed: number;
}> {
  const client = getClient();

  // Build messages array with conversation history for multi-turn context
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  if (conversationHistory && conversationHistory.length > 0) {
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  messages.push({
    role: "user",
    content: question,
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: NL_TO_SQL_SYSTEM_PROMPT,
    messages,
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const tokensUsed =
    (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

  // Parse JSON response — handle markdown code blocks
  let jsonStr = textContent.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const result = JSON.parse(jsonStr) as SQLGenerationResult;
    return { result, tokensUsed };
  } catch {
    throw new Error("Failed to parse SQL generation response");
  }
}

// ─── Results Interpretation ──────────────────────────────────────

export async function interpretResults(
  question: string,
  sql: string,
  results: Record<string, unknown>[],
  chartType: string
): Promise<InterpretationResult> {
  const client = getClient();

  const resultsPreview = results.slice(0, 20);
  const totalRows = results.length;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: RESULTS_INTERPRETER_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `User question: "${question}"

Query returned ${totalRows} rows. Here's a preview of the results:
${JSON.stringify(resultsPreview, null, 2)}

Provide a clear, friendly interpretation of these results.`,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  const tokensUsed =
    (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

  return {
    interpretation:
      textContent?.type === "text"
        ? textContent.text
        : "Unable to interpret results.",
    tokensUsed,
  };
}
