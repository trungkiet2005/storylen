import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Clean DOM between tests
afterEach(() => {
  cleanup();
});

// Reset localStorage between tests so persistence-backed code starts fresh.
// jsdom provides a real localStorage implementation; we just clear it.
beforeEach(() => {
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
});

// framer-motion's animate-presence uses ResizeObserver in some paths
if (typeof globalThis.ResizeObserver === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
