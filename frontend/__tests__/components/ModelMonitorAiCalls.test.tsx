import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

// Mock the API layer so the admin page renders offline.
vi.mock("@/lib/api", () => ({
  adminGetModelMonitorSummary: vi.fn(),
  adminGetModelMonitorAB: vi.fn(),
  adminSetModelMonitorAB: vi.fn(),
  adminGetModelMonitorAiCalls: vi.fn(),
}));

import AdminModelMonitorPage from "@/app/admin/model-monitor/page";
import {
  adminGetModelMonitorSummary,
  adminGetModelMonitorAB,
  adminGetModelMonitorAiCalls,
} from "@/lib/api";

const mockSummary = vi.mocked(adminGetModelMonitorSummary);
const mockAB = vi.mocked(adminGetModelMonitorAB);
const mockAiCalls = vi.mocked(adminGetModelMonitorAiCalls);

const SUMMARY = {
  total_pages: 10, avg_ocr_confidence: 0.8, avg_latency_ms: 1200,
  translation_success_rate: 0.95, avg_bubble_count: 4.2, bubble_detection_rate: 0.9,
  drift_status: "ok", drift_details: [], time_series: [],
};
const AB = { variants: [], recommendation: "No data yet." };
const AI_CALLS = {
  models: [
    {
      provider: "ollama", model: "qwen2.5vl:7b", operation: "vlm.describe",
      calls: 5, success_rate: 0.8, avg_latency_ms: 9500,
      prompt_tokens: 6000, completion_tokens: 1250, cost_usd: 0,
    },
    {
      provider: "gemini", model: "gemini-2.5-flash", operation: "qa.answer",
      calls: 12, success_rate: 1.0, avg_latency_ms: 1100,
      prompt_tokens: 8000, completion_tokens: 2000, cost_usd: 0.0074,
    },
  ],
  totals: { calls: 17, cost_usd: 0.0074, tokens: 17250 },
};

beforeEach(() => {
  mockSummary.mockReset().mockResolvedValue(SUMMARY as never);
  mockAB.mockReset().mockResolvedValue(AB as never);
  mockAiCalls.mockReset().mockResolvedValue(AI_CALLS as never);
});

describe("Model Monitor · AI Calls section", () => {
  it("fetches ai-call telemetry on load", async () => {
    render(<AdminModelMonitorPage />);
    await waitFor(() => expect(mockAiCalls).toHaveBeenCalled());
  });

  it("renders per-model rows and totals", async () => {
    render(<AdminModelMonitorPage />);
    const section = await screen.findByTestId("ai-calls-section");
    expect(section).toBeTruthy();
    // Both models appear.
    expect(screen.getByText("qwen2.5vl:7b")).toBeTruthy();
    expect(screen.getByText("gemini-2.5-flash")).toBeTruthy();
    // Operations shown.
    expect(screen.getByText("vlm.describe")).toBeTruthy();
    expect(screen.getByText("qa.answer")).toBeTruthy();
    // Total cost formatted (appears for the totals KPI + the gemini row).
    expect(screen.getAllByText("$0.00740").length).toBeGreaterThan(0);
  });

  it("shows an empty state when no calls recorded", async () => {
    mockAiCalls.mockResolvedValue({ models: [], totals: { calls: 0, cost_usd: 0, tokens: 0 } } as never);
    render(<AdminModelMonitorPage />);
    await screen.findByTestId("ai-calls-section");
    expect(screen.getByText(/Chưa có lượt gọi nào/)).toBeTruthy();
  });
});
