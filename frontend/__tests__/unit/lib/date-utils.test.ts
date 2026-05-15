import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatRelativeTime } from "@/lib/date-utils";

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns '—' for invalid date", () => {
    expect(formatRelativeTime("not-a-date")).toBe("—");
    expect(formatRelativeTime("")).toBe("—");
  });

  it("returns 'vừa xong' for less than 1 minute ago", () => {
    const iso = new Date(Date.now() - 30_000).toISOString();
    expect(formatRelativeTime(iso)).toBe("vừa xong");
  });

  it("returns minutes for 1–59 minutes ago", () => {
    const iso = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatRelativeTime(iso)).toBe("5 phút trước");
  });

  it("returns 59 phút for 59 minutes ago", () => {
    const iso = new Date(Date.now() - 59 * 60_000).toISOString();
    expect(formatRelativeTime(iso)).toBe("59 phút trước");
  });

  it("returns hours for 1–23 hours ago", () => {
    const iso = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
    expect(formatRelativeTime(iso)).toBe("3 giờ trước");
  });

  it("returns days for 1–6 days ago", () => {
    const iso = new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString();
    expect(formatRelativeTime(iso)).toBe("3 ngày trước");
  });

  it("returns locale date for 7+ days ago", () => {
    const past = new Date(Date.now() - 10 * 24 * 60 * 60_000);
    const result = formatRelativeTime(past.toISOString());
    expect(result).toBe(past.toLocaleDateString("vi-VN"));
  });

  it("returns exactly 1 phút trước at boundary", () => {
    const iso = new Date(Date.now() - 60_000).toISOString();
    expect(formatRelativeTime(iso)).toBe("1 phút trước");
  });
});
