"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Send,
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Users as UsersIcon,
  Loader2,
  Code2,
  ChevronDown,
  ChevronUp,
  Plus,
  MessageSquare,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Pin,
} from "lucide-react";
import { DynamicChart } from "@/components/charts/dynamic-chart";

const suggestedQuestions = [
  { text: "What were my top 5 products last month?", icon: ShoppingBag },
  { text: "How does this week compare to last week?", icon: TrendingUp },
  { text: "Which customers haven't ordered in 90 days?", icon: UsersIcon },
  { text: "Show me revenue by day for the last 30 days", icon: BarChart3 },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  explanation?: string;
  chart_type?: "bar" | "line" | "pie" | "table" | "number";
  chart_config?: { x_axis?: string; y_axis?: string; label?: string };
  data?: Record<string, unknown>[];
  error?: string;
  execution_time_ms?: number;
  tokens_used?: number;
}

interface Conversation {
  id: string;
  title: string;
  is_pinned: boolean;
  updated_at: string;
}

interface SavedQuery {
  id: string;
  name: string;
  question: string;
  chart_type: string | null;
  created_at: string;
}

export default function AskPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const fetchSavedQueries = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/saved-queries");
      if (res.ok) {
        const data = await res.json();
        setSavedQueries(data.queries ?? []);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchSavedQueries();
  }, [fetchConversations, fetchSavedQueries]);

  async function loadConversation(conversationId: string) {
    try {
      const res = await fetch(`/api/ai/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveConversationId(conversationId);
        setMessages(
          (data.messages ?? []).map(
            (m: {
              id: string;
              role: string;
              content: string;
              generated_sql?: string;
              chart_type?: string;
              chart_config?: Record<string, string>;
              data?: Record<string, unknown>[];
              tokens_used?: number;
              execution_time_ms?: number;
            }) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              sql: m.generated_sql,
              chart_type: m.chart_type as Message["chart_type"],
              chart_config: m.chart_config,
              data: m.data,
              tokens_used: m.tokens_used,
              execution_time_ms: m.execution_time_ms,
            })
          )
        );
      }
    } catch {
      // Silently fail
    }
  }

  function handleNewConversation() {
    setActiveConversationId(null);
    setMessages([]);
    setQuery("");
  }

  async function handleDeleteConversation(id: string) {
    try {
      await fetch("/api/ai/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        handleNewConversation();
      }
    } catch {
      // Silently fail
    }
  }

  async function handleSaveQuery(msg: Message) {
    const name = msg.content.slice(0, 60);
    try {
      const res = await fetch("/api/ai/saved-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          question: msg.content,
          generated_sql: msg.sql,
          chart_type: msg.chart_type,
          chart_config: msg.chart_config,
        }),
      });
      if (res.ok) {
        fetchSavedQueries();
      }
    } catch {
      // Silently fail
    }
  }

  async function handleSubmit(question?: string) {
    const q = (question || query).trim();
    if (!q || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: q,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          conversation_id: activeConversationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.error || "Something went wrong.",
            error: data.error,
            sql: data.sql,
            explanation: data.explanation,
          },
        ]);
        return;
      }

      // Set conversation ID if this was a new conversation
      if (data.conversation_id && !activeConversationId) {
        setActiveConversationId(data.conversation_id);
        fetchConversations();
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.interpretation,
          sql: data.sql,
          explanation: data.explanation,
          chart_type: data.chart_type,
          chart_config: data.chart_config,
          data: data.data,
          execution_time_ms: data.execution_time_ms,
          tokens_used: data.tokens_used,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Failed to process your question. Please try again.",
          error: "Network error",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Group conversations by date
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const pinnedConvs = conversations.filter((c) => c.is_pinned);
  const todayConvs = conversations.filter(
    (c) => !c.is_pinned && new Date(c.updated_at).toDateString() === today
  );
  const yesterdayConvs = conversations.filter(
    (c) => !c.is_pinned && new Date(c.updated_at).toDateString() === yesterday
  );
  const olderConvs = conversations.filter(
    (c) =>
      !c.is_pinned &&
      new Date(c.updated_at).toDateString() !== today &&
      new Date(c.updated_at).toDateString() !== yesterday
  );

  return (
    <div className="flex gap-6" style={{ height: "calc(100vh - 6rem)" }}>
      {/* Conversation Sidebar */}
      <div className="w-64 shrink-0 flex flex-col border-r border-border pr-4">
        <button
          onClick={handleNewConversation}
          className="mb-4 flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </button>

        {/* Saved queries toggle */}
        {savedQueries.length > 0 && (
          <button
            onClick={() => setShowSaved(!showSaved)}
            className="mb-3 flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground"
          >
            <BookmarkCheck className="h-3.5 w-3.5" />
            Saved Queries ({savedQueries.length})
            {showSaved ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        )}

        {showSaved && (
          <div className="mb-4 space-y-1 max-h-32 overflow-y-auto">
            {savedQueries.map((sq) => (
              <button
                key={sq.id}
                onClick={() => handleSubmit(sq.question)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-secondary hover:bg-surface-hover hover:text-foreground"
              >
                <Bookmark className="h-3 w-3 shrink-0 text-primary" />
                <span className="truncate">{sq.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-3">
          {pinnedConvs.length > 0 && (
            <ConversationGroup
              label="Pinned"
              conversations={pinnedConvs}
              activeId={activeConversationId}
              onSelect={loadConversation}
              onDelete={handleDeleteConversation}
            />
          )}
          {todayConvs.length > 0 && (
            <ConversationGroup
              label="Today"
              conversations={todayConvs}
              activeId={activeConversationId}
              onSelect={loadConversation}
              onDelete={handleDeleteConversation}
            />
          )}
          {yesterdayConvs.length > 0 && (
            <ConversationGroup
              label="Yesterday"
              conversations={yesterdayConvs}
              activeId={activeConversationId}
              onSelect={loadConversation}
              onDelete={handleDeleteConversation}
            />
          )}
          {olderConvs.length > 0 && (
            <ConversationGroup
              label="Older"
              conversations={olderConvs}
              activeId={activeConversationId}
              onSelect={loadConversation}
              onDelete={handleDeleteConversation}
            />
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Ask Korva</h1>
          <p className="mt-1 text-sm text-secondary">
            Ask questions about your e-commerce data in plain English.
          </p>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8">
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted">
                  Korva will translate your question into SQL, run the query, and
                  give you a plain-English answer with charts.
                </p>
                <div className="pt-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
                    Try asking
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {suggestedQuestions.map((q) => {
                      const Icon = q.icon;
                      return (
                        <button
                          key={q.text}
                          onClick={() => handleSubmit(q.text)}
                          className="flex items-center gap-3 rounded-lg border border-border p-3 text-left text-sm text-foreground transition-colors hover:border-primary hover:bg-primary/5"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted" />
                          {q.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-white">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <AssistantMessage message={msg} onSave={handleSaveQuery} />
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted">Analyzing your question...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="sticky bottom-0 pt-2 pb-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2 shadow-lg"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about your data..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-30"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ConversationGroup({
  label,
  conversations,
  activeId,
  onSelect,
  onDelete,
}: {
  label: string;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <div className="space-y-0.5">
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm cursor-pointer transition-colors ${
              activeId === c.id
                ? "bg-primary/10 text-primary"
                : "text-secondary hover:bg-surface-hover hover:text-foreground"
            }`}
            onClick={() => onSelect(c.id)}
          >
            {c.is_pinned ? (
              <Pin className="h-3 w-3 shrink-0 text-primary" />
            ) : (
              <MessageSquare className="h-3 w-3 shrink-0" />
            )}
            <span className="flex-1 truncate text-xs">{c.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(c.id);
              }}
              className="hidden group-hover:block"
            >
              <Trash2 className="h-3 w-3 text-muted hover:text-danger" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  onSave,
}: {
  message: Message;
  onSave: (msg: Message) => void;
}) {
  const [showSQL, setShowSQL] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-3">
        {message.error ? (
          <p className="text-sm text-danger">{message.content}</p>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {message.content}
          </p>
        )}

        {message.chart_type && message.data && message.data.length > 0 && (
          <div className="mt-4">
            <DynamicChart
              type={message.chart_type}
              data={message.data}
              config={message.chart_config ?? {}}
            />
          </div>
        )}

        <div className="mt-3 border-t border-border pt-3 flex items-center gap-3">
          {message.sql && (
            <button
              onClick={() => setShowSQL(!showSQL)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              <Code2 className="h-3 w-3" />
              {showSQL ? "Hide" : "Show"} SQL
              {showSQL ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          )}

          {!message.error && (
            <button
              onClick={() => {
                onSave(message);
                setSaved(true);
              }}
              disabled={saved}
              className="flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
            >
              {saved ? (
                <BookmarkCheck className="h-3 w-3 text-success" />
              ) : (
                <Bookmark className="h-3 w-3" />
              )}
              {saved ? "Saved" : "Save"}
            </button>
          )}
        </div>

        {showSQL && message.sql && (
          <pre className="mt-2 overflow-x-auto rounded-lg bg-dark p-3 text-xs text-white">
            <code>{message.sql}</code>
          </pre>
        )}

        {message.execution_time_ms && (
          <p className="mt-2 text-[10px] text-muted">
            {message.execution_time_ms}ms
            {message.tokens_used ? ` · ${message.tokens_used} tokens` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
