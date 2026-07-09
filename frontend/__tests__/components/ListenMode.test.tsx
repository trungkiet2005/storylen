import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ─── Mock the API layer ───────────────────────────────────────────────────────
vi.mock("@/lib/api", () => {
  class APIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return {
    APIError,
    listVoices: vi.fn(),
    narratePage: vi.fn(),
    getChapterRecapVideo: vi.fn(),
  };
});

import { ListenMode } from "@/components/ListenMode";
import { listVoices, narratePage, getChapterRecapVideo, APIError } from "@/lib/api";

const mockListVoices = vi.mocked(listVoices);
const mockNarrate = vi.mocked(narratePage);
const mockRecapVideo = vi.mocked(getChapterRecapVideo);

const VOICES = {
  default_engine: "edge",
  credit_cost_per_page: 1,
  max_chapter_pages: 60,
  engines: [
    {
      engine: "edge",
      available: true,
      is_default: true,
      voices: [
        { id: "vi-VN-HoaiMyNeural", label: "Hoài My (nữ, VN)", locale: "vi-VN", gender: "Female" },
        { id: "vi-VN-NamMinhNeural", label: "Nam Minh (nam, VN)", locale: "vi-VN", gender: "Male" },
      ],
    },
    { engine: "coqui", available: false, is_default: false, voices: [] },
  ],
};

const NARRATION = {
  page_id: "p1",
  script: "Người hùng bước ra khỏi bóng tối.",
  audio_url: "https://audio.example.com/p1.mp3",
  mime: "audio/mpeg",
  engine: "edge",
  voice: "vi-VN-HoaiMyNeural",
  source: "vlm" as const,
  dialogue_lines: ["Ta đến đây"],
};

beforeAll(() => {
  // jsdom doesn't implement media playback — stub so autoplay doesn't throw.
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.load = vi.fn();
});

beforeEach(() => {
  mockListVoices.mockReset();
  mockNarrate.mockReset();
  mockRecapVideo.mockReset();
  mockListVoices.mockResolvedValue(VOICES as never);
  mockNarrate.mockResolvedValue(NARRATION as never);
});

describe("ListenMode", () => {
  it("renders the trigger button", () => {
    render(<ListenMode pageId="p1" />);
    expect(screen.getByTestId("listen-mode-trigger")).toBeTruthy();
  });

  it("does not show the panel until the trigger is clicked", () => {
    render(<ListenMode pageId="p1" />);
    expect(screen.queryByTestId("listen-mode-panel")).toBeNull();
  });

  it("opens the panel and loads voices", async () => {
    render(<ListenMode pageId="p1" />);
    fireEvent.click(screen.getByTestId("listen-mode-trigger"));
    expect(await screen.findByTestId("listen-mode-panel")).toBeTruthy();
    await waitFor(() => expect(mockListVoices).toHaveBeenCalled());
    // Only the available engine is offered.
    const engineSelect = screen.getByTestId("listen-engine-select") as HTMLSelectElement;
    await waitFor(() => expect(engineSelect.value).toBe("edge"));
    const options = Array.from(engineSelect.querySelectorAll("option")).map(o => o.value);
    expect(options).toContain("edge");
    expect(options).not.toContain("coqui"); // unavailable engine hidden
  });

  it("populates voices for the selected engine", async () => {
    render(<ListenMode pageId="p1" />);
    fireEvent.click(screen.getByTestId("listen-mode-trigger"));
    const voiceSelect = (await screen.findByTestId("listen-voice-select")) as HTMLSelectElement;
    await waitFor(() => {
      const vids = Array.from(voiceSelect.querySelectorAll("option")).map(o => o.value);
      expect(vids).toContain("vi-VN-HoaiMyNeural");
      expect(vids).toContain("vi-VN-NamMinhNeural");
    });
  });

  it("generates narration and renders audio + script", async () => {
    render(<ListenMode pageId="p1" />);
    fireEvent.click(screen.getByTestId("listen-mode-trigger"));
    await screen.findByTestId("listen-generate");
    fireEvent.click(screen.getByTestId("listen-generate"));

    await waitFor(() => expect(mockNarrate).toHaveBeenCalledWith("p1", expect.objectContaining({ engine: "edge" })));
    const audio = (await screen.findByTestId("listen-audio")) as HTMLAudioElement;
    expect(audio.getAttribute("src")).toBe("https://audio.example.com/p1.mp3");
    expect(screen.getByText("Người hùng bước ra khỏi bóng tối.")).toBeTruthy();
  });

  it("shows a fallback badge when the VLM was unavailable", async () => {
    mockNarrate.mockResolvedValue({ ...NARRATION, source: "dialogue_fallback" } as never);
    render(<ListenMode pageId="p1" />);
    fireEvent.click(screen.getByTestId("listen-mode-trigger"));
    await screen.findByTestId("listen-generate");
    fireEvent.click(screen.getByTestId("listen-generate"));
    expect(await screen.findByText(/đọc thoại/)).toBeTruthy();
  });

  it("surfaces an API error", async () => {
    mockNarrate.mockRejectedValue(new APIError(402, "Hết credit"));
    render(<ListenMode pageId="p1" />);
    fireEvent.click(screen.getByTestId("listen-mode-trigger"));
    await screen.findByTestId("listen-generate");
    fireEvent.click(screen.getByTestId("listen-generate"));
    const err = await screen.findByTestId("listen-error");
    expect(err.textContent).toContain("Hết credit");
  });

  it("handles a voice-list load failure gracefully", async () => {
    mockListVoices.mockRejectedValue(new APIError(500, "boom"));
    render(<ListenMode pageId="p1" />);
    fireEvent.click(screen.getByTestId("listen-mode-trigger"));
    expect(await screen.findByTestId("listen-error")).toBeTruthy();
  });
});

describe("ListenMode — chapter recap tab", () => {
  it("does not show a chapter tab when chapterId is not provided", async () => {
    render(<ListenMode pageId="p1" />);
    fireEvent.click(screen.getByTestId("listen-mode-trigger"));
    await screen.findByTestId("listen-mode-panel");
    expect(screen.queryByTestId("listen-tab-chapter")).toBeNull();
  });

  it("shows both tabs when chapterId is provided, defaulting to the page tab", async () => {
    render(<ListenMode pageId="p1" chapterId="c1" chapterPageCount={5} />);
    fireEvent.click(screen.getByTestId("listen-mode-trigger"));
    await screen.findByTestId("listen-tab-chapter");
    expect(screen.getByTestId("listen-generate")).toBeTruthy();
    expect(screen.queryByTestId("listen-recap-generate")).toBeNull();
  });

  it("shows the credit cost before generating and calls getChapterRecapVideo on click", async () => {
    mockRecapVideo.mockResolvedValue({ chapter_id: "c1", video_url: "https://video.example.com/c1.mp4" } as never);
    render(<ListenMode pageId="p1" chapterId="c1" chapterPageCount={5} />);
    fireEvent.click(screen.getByTestId("listen-mode-trigger"));
    fireEvent.click(await screen.findByTestId("listen-tab-chapter"));

    const cost = await screen.findByTestId("listen-recap-cost");
    expect(cost.textContent).toContain("5");

    fireEvent.click(screen.getByTestId("listen-recap-generate"));
    await waitFor(() => expect(mockRecapVideo).toHaveBeenCalledWith("c1", expect.objectContaining({ engine: "edge" })));
    const video = (await screen.findByTestId("listen-recap-video")) as HTMLVideoElement;
    expect(video.getAttribute("src")).toBe("https://video.example.com/c1.mp4");
    expect(screen.getByTestId("listen-recap-download")).toBeTruthy();
  });

  it("disables the recap button and warns when the chapter exceeds the page limit", async () => {
    render(<ListenMode pageId="p1" chapterId="c1" chapterPageCount={999} />);
    fireEvent.click(screen.getByTestId("listen-mode-trigger"));
    fireEvent.click(await screen.findByTestId("listen-tab-chapter"));
    const btn = (await screen.findByTestId("listen-recap-generate")) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("surfaces a recap generation error", async () => {
    mockRecapVideo.mockRejectedValue(new APIError(503, "Xuất video recap chưa khả dụng trên máy chủ này (thiếu ffmpeg)."));
    render(<ListenMode pageId="p1" chapterId="c1" chapterPageCount={5} />);
    fireEvent.click(screen.getByTestId("listen-mode-trigger"));
    fireEvent.click(await screen.findByTestId("listen-tab-chapter"));
    fireEvent.click(await screen.findByTestId("listen-recap-generate"));
    const err = await screen.findByTestId("listen-error");
    expect(err.textContent).toContain("ffmpeg");
  });
});
