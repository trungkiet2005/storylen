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
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// framer-motion's whileInView uses IntersectionObserver
if (typeof globalThis.IntersectionObserver === "undefined") {
  (globalThis as any).IntersectionObserver = class {
    constructor(cb: IntersectionObserverCallback) {
      // immediately call with an empty entry so whileInView components treat themselves as visible
      cb([], this as unknown as IntersectionObserver);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds = [];
    takeRecords(): IntersectionObserverEntry[] { return []; }
  };
}
