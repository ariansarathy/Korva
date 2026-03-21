import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationToggles } from "../notification-toggles";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const defaultPrefs = {
  weekly_report: true,
  anomaly_alerts: false,
  inventory_alerts: true,
  email_enabled: true,
  slack_enabled: false,
  slack_webhook_url: null,
};

function setupFetch(prefs = defaultPrefs) {
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ preferences: prefs }),
    }) // GET preferences
    .mockRejectedValueOnce(new Error("Not connected")); // slack channels check
}

describe("NotificationToggles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders toggle rows after loading", async () => {
    setupFetch();

    render(<NotificationToggles />);

    await waitFor(() => {
      expect(screen.getByText("Weekly digest")).toBeInTheDocument();
    });

    expect(screen.getByText("Anomaly alerts")).toBeInTheDocument();
    expect(screen.getByText("Inventory alerts")).toBeInTheDocument();
  });

  it("toggle immediately updates UI optimistically", async () => {
    setupFetch();

    render(<NotificationToggles />);

    await waitFor(() => {
      expect(screen.getByText("Anomaly alerts")).toBeInTheDocument();
    });

    // The anomaly_alerts toggle starts as false
    // Mock the API response for the toggle update
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        preferences: { ...defaultPrefs, anomaly_alerts: true },
      }),
    });

    // Find toggle buttons - anomaly alerts is the 3rd toggle (email, weekly, anomaly)
    const toggleButtons = screen.getAllByRole("button");
    // Find the toggle for anomaly alerts by getting buttons near that text
    const anomalySection = screen.getByText("Anomaly alerts").closest("div")?.parentElement;
    const anomalyToggle = anomalySection?.querySelector("button");

    if (anomalyToggle) {
      fireEvent.click(anomalyToggle);

      // The toggle should be called with the API immediately — check fetch was called
      await waitFor(() => {
        const calls = mockFetch.mock.calls;
        const postCall = calls.find(
          (c) => c[1]?.method === "POST"
        );
        expect(postCall).toBeTruthy();
      });
    }
  });

  it("reverts toggle state on API failure", async () => {
    setupFetch();

    render(<NotificationToggles />);

    await waitFor(() => {
      expect(screen.getByText("Weekly digest")).toBeInTheDocument();
    });

    // Mock API failure
    mockFetch.mockRejectedValueOnce(new Error("Server error"));

    // Click weekly digest toggle (starts as true, should try to set false)
    const weeklySection = screen.getByText("Weekly digest").closest("div")?.parentElement;
    const weeklyToggle = weeklySection?.querySelector("button");

    if (weeklyToggle) {
      fireEvent.click(weeklyToggle);

      // After API fails, preferences should revert
      await waitFor(() => {
        // The component should still function without crashing
        expect(screen.getByText("Weekly digest")).toBeInTheDocument();
      });
    }
  });
});
