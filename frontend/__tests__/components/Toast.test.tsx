import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { ToastProvider, useToast } from "@/components/Toast";

function TriggerToast({ message, type }: { message: string; type?: "success" | "error" | "info" | "warning" }) {
  const { toast } = useToast();
  return (
    <button onClick={() => toast(message, type ?? "info")}>show toast</button>
  );
}

function renderWithProvider(ui: React.ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("Toast", () => {
  it("shows a toast message when triggered", () => {
    renderWithProvider(<TriggerToast message="Hello world" />);
    fireEvent.click(screen.getByText("show toast"));
    expect(screen.getByText("Hello world")).toBeTruthy();
  });

  it("removes toast on click", () => {
    renderWithProvider(<TriggerToast message="Click to dismiss" />);
    fireEvent.click(screen.getByText("show toast"));
    const toast = screen.getByRole("alert");
    fireEvent.click(toast);
    expect(screen.queryByText("Click to dismiss")).toBeNull();
  });

  it("auto-dismisses after duration", async () => {
    vi.useFakeTimers();
    renderWithProvider(<TriggerToast message="Auto dismiss" />);
    fireEvent.click(screen.getByText("show toast"));
    expect(screen.getByText("Auto dismiss")).toBeTruthy();
    await act(async () => { vi.advanceTimersByTime(4001); });
    expect(screen.queryByText("Auto dismiss")).toBeNull();
    vi.useRealTimers();
  });

  it("renders multiple toasts", () => {
    renderWithProvider(
      <>
        <TriggerToast message="Toast 1" />
        <TriggerToast message="Toast 2" />
      </>
    );
    const [btn1, btn2] = screen.getAllByText(/show toast/i);
    fireEvent.click(btn1);
    fireEvent.click(btn2);
    expect(screen.getByText("Toast 1")).toBeTruthy();
    expect(screen.getByText("Toast 2")).toBeTruthy();
  });

  it("keeps max 5 toasts (queue cap)", () => {
    function MultiTrigger() {
      const { toast } = useToast();
      return (
        <button onClick={() => {
          for (let i = 1; i <= 7; i++) toast(`Toast ${i}`, "info");
        }}>add many</button>
      );
    }
    renderWithProvider(<MultiTrigger />);
    fireEvent.click(screen.getByText("add many"));
    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeLessThanOrEqual(5);
  });

  it("unique ids across rapid calls (counter monotonic)", () => {
    function RapidTrigger() {
      const { toast } = useToast();
      return (
        <button onClick={() => {
          toast("A", "info");
          toast("B", "info");
          toast("C", "info");
        }}>rapid</button>
      );
    }
    renderWithProvider(<RapidTrigger />);
    fireEvent.click(screen.getByText("rapid"));
    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBe(3);
  });
});
