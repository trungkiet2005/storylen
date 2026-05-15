import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { CreditBadge } from "@/components/CreditBadge";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { useAuth } from "@/contexts/AuthContext";
const mockUseAuth = vi.mocked(useAuth);

describe("CreditBadge", () => {
  it("renders nothing when user is null", () => {
    mockUseAuth.mockReturnValue({ user: null } as never);
    const { container } = render(<CreditBadge />);
    expect(container.firstChild).toBeNull();
  });

  it("shows credit balance and FREE label for free plan", () => {
    mockUseAuth.mockReturnValue({
      user: { plan_tier: "free", credits_balance: 5 },
    } as never);
    render(<CreditBadge />);
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("FREE")).toBeTruthy();
  });

  it("shows PRO label for pro plan", () => {
    mockUseAuth.mockReturnValue({
      user: { plan_tier: "pro", credits_balance: 50 },
    } as never);
    render(<CreditBadge />);
    expect(screen.getByText("PRO")).toBeTruthy();
  });

  it("shows BASIC label for basic plan", () => {
    mockUseAuth.mockReturnValue({
      user: { plan_tier: "basic", credits_balance: 10 },
    } as never);
    render(<CreditBadge />);
    expect(screen.getByText("BASIC")).toBeTruthy();
  });

  it("shows PREMIUM label for premium plan", () => {
    mockUseAuth.mockReturnValue({
      user: { plan_tier: "premium", credits_balance: 100 },
    } as never);
    render(<CreditBadge />);
    expect(screen.getByText("PREMIUM")).toBeTruthy();
  });

  it("falls back to FREE label for unknown plan tier", () => {
    mockUseAuth.mockReturnValue({
      user: { plan_tier: "enterprise", credits_balance: 999 },
    } as never);
    render(<CreditBadge />);
    expect(screen.getByText("FREE")).toBeTruthy();
  });

  it("links to /plans", () => {
    mockUseAuth.mockReturnValue({
      user: { plan_tier: "free", credits_balance: 3 },
    } as never);
    render(<CreditBadge />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/plans");
  });
});
