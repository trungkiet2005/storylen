"use client";

/**
 * PWAInstallPrompt — Tier A #6.
 *
 * Listens for the browser's `beforeinstallprompt` event and surfaces a custom
 * banner after the user has engaged a bit (default: visited 2 page-views in
 * the same session). Banner is dismissible and the user choice persists in
 * localStorage so we don't pester them across sessions.
 *
 * Apple/iOS doesn't fire beforeinstallprompt — for those, we show a one-line
 * hint "Add to Home Screen via Share menu" once when running on iOS Safari.
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/Icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "storylens_pwa_install_state";
const VIEW_COUNT_KEY = "storylens_pwa_view_count";
const MIN_VIEWS = 2;

type InstallState = "default" | "dismissed" | "installed" | "ios_seen";

function loadState(): InstallState {
  if (typeof window === "undefined") return "default";
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === "dismissed" || v === "installed" || v === "ios_seen") return v;
  return "default";
}

function saveState(s: InstallState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, s);
  } catch { /* quota */ }
}

function bumpViewCount(): number {
  try {
    const cur = parseInt(window.localStorage.getItem(VIEW_COUNT_KEY) || "0", 10) || 0;
    const next = cur + 1;
    window.localStorage.setItem(VIEW_COUNT_KEY, String(next));
    return next;
  } catch {
    return MIN_VIEWS;
  }
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari only
    window.navigator.standalone === true
  );
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;

    const state = loadState();
    if (state === "installed") return;

    const views = bumpViewCount();
    const enoughEngagement = views >= MIN_VIEWS;

    // Android / desktop Chrome
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (state !== "dismissed" && enoughEngagement) {
        setVisible(true);
      }
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const onInstalled = () => {
      saveState("installed");
      setVisible(false);
      setShowIOSHint(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari fallback — no beforeinstallprompt
    if (isIOS() && state !== "ios_seen" && state !== "dismissed" && enoughEngagement) {
      setShowIOSHint(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        saveState("installed");
      } else {
        saveState("dismissed");
      }
    } catch {
      // ignore — some browsers throw when prompted twice
    } finally {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    saveState("dismissed");
    setVisible(false);
    setShowIOSHint(false);
  };

  const handleIOSDismiss = () => {
    saveState("ios_seen");
    setShowIOSHint(false);
  };

  return (
    <AnimatePresence>
      {visible && deferredPrompt && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          style={{
            position: "fixed",
            bottom: 16,
            left: 16,
            right: 16,
            maxWidth: 440,
            margin: "0 auto",
            zIndex: 800,
            background: "var(--panel)",
            border: "2.5px solid var(--border)",
            boxShadow: "5px 5px 0 var(--border)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36, height: 36, flexShrink: 0,
              background: "var(--accent)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Icon name="download" size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Cài StoryLens</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              Truy cập nhanh, đọc khi offline, không cần mở trình duyệt
            </div>
          </div>
          <button
            onClick={handleInstall}
            className="btn btn-sm btn-primary"
            style={{ fontSize: 12, padding: "6px 12px" }}
          >
            Cài
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Bỏ qua"
            style={{
              background: "transparent",
              border: "1.5px solid var(--border-soft)",
              padding: "4px 6px",
              cursor: "pointer",
              color: "var(--muted)",
            }}
          >
            <Icon name="close" size={10} />
          </button>
        </motion.div>
      )}

      {showIOSHint && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          style={{
            position: "fixed",
            bottom: 16,
            left: 16,
            right: 16,
            maxWidth: 440,
            margin: "0 auto",
            zIndex: 800,
            background: "var(--panel)",
            border: "2.5px solid var(--border)",
            boxShadow: "5px 5px 0 var(--border)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 22 }}>📱</span>
          <div style={{ flex: 1, fontSize: 12, lineHeight: 1.4 }}>
            <strong>Cài lên iPhone:</strong> nhấn <Icon name="share" size={11} /> Chia sẻ →
            <em> Add to Home Screen</em>
          </div>
          <button
            onClick={handleIOSDismiss}
            aria-label="Đã hiểu"
            style={{
              background: "transparent",
              border: "1.5px solid var(--border-soft)",
              padding: "4px 6px",
              cursor: "pointer",
              color: "var(--muted)",
            }}
          >
            <Icon name="close" size={10} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
