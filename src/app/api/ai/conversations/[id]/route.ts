import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";

/**
 * GET /api/ai/conversations/[id]
 * Fetch conversation messages.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Verify ownership
    const { data: conversation } = await supabase
      .from("ai_conversations")
      .select("id, title, is_pinned")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Fetch messages
    const { data: messages } = await supabase
      .from("ai_conversation_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      conversation,
      messages: messages ?? [],
    });
  } catch (error) {
    console.error("Fetch conversation error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ai/conversations/[id]
 * Update conversation title or pin status.
 * Body: { title?: string, is_pinned?: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.is_pinned !== undefined) updates.is_pinned = body.is_pinned;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_conversations")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update conversation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversation: data });
  } catch (error) {
    console.error("Update conversation error:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}
