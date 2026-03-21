import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { isDemoMode } from "@/lib/demo";

/**
 * GET /api/ai/conversations
 * List conversations ordered by updated_at DESC.
 */
export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({ conversations: [] });
  }

  try {
    const { userId } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: conversations } = await supabase
      .from("ai_conversations")
      .select("id, title, is_pinned, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ conversations: conversations ?? [] });
  } catch (error) {
    console.error("List conversations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/conversations
 * Create a new conversation.
 * Body: { title?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const title = body.title || "New Conversation";

    const supabase = await createClient();
    const { data: conversation, error } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: userId,
        store_id: store?.id ?? null,
        title,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai/conversations
 * Delete a conversation by ID.
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const supabase = await createClient();
    await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete conversation error:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
