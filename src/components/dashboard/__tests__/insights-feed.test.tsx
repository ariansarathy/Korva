import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InsightsFeed } from "../insights-feed";
import type { Insight } from "@/lib/supabase/types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockInsights: Insight[] = [
  {
    id: "i1",
    store_id: "s1",
    title: "Revenue is up 25%",
    body: "Your revenue has increased significantly this week.",
    severity: "positive",
    metric_value: "+25%",
    created_at: new Date().toISOString(),
    is_read: false,
    category: "revenue",
  },
  {
    id: "i2",
    store_id: "s1",
    title: "Low stock alert",
    body: "3 products are running low on inventory.",
    severity: "warning",
    metric_value: "3 products",
    created_at: new Date().toISOString(),
    is_read: false,
    category: "inventory",
  },
];

describe("InsightsFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders insights", () => {
    render(<InsightsFeed insights={mockInsights} storeId="s1" />);

    expect(screen.getByText("Revenue is up 25%")).toBeInTheDocument();
    expect(screen.getByText("Low stock alert")).toBeInTheDocument();
  });

  it("shows empty state when no insights", () => {
    render(<InsightsFeed insights={[]} storeId="s1" />);

    expect(
      screen.getByText(/ai insights will appear here/i)
    ).toBeInTheDocument();
  });

  it("refresh triggers fetch and updates in-place", async () => {
    const newInsights = [
      {
        id: "i3",
        store_id: "s1",
        title: "New Insight",
        body: "Fresh data.",
        severity: "info",
        metric_value: null,
        created_at: new Date().toISOString(),
        is_read: false,
        category: "general",
      },
    ];

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // POST /api/ai/insights
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ insights: newInsights }),
      }); // GET /api/v1/insights

    render(<InsightsFeed insights={mockInsights} storeId="s1" />);

    const refreshButton = screen.getAllByRole("button", { name: /refresh/i })[0];
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText("New Insight")).toBeInTheDocument();
    });

    // Old insights should be replaced
    expect(screen.queryByText("Revenue is up 25%")).not.toBeInTheDocument();
  });

  it("handles refresh failure gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<InsightsFeed insights={mockInsights} storeId="s1" />);

    const refreshButton = screen.getAllByRole("button", { name: /refresh/i })[0];
    fireEvent.click(refreshButton);

    await waitFor(() => {
      // Original insights should still be visible
      expect(screen.getByText("Revenue is up 25%")).toBeInTheDocument();
    });
  });
});
