"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile — a free, privacy-friendly captcha that drops
 * almost no UI in front of real users but blocks bots from spam-signup /
 * spam-forgot-password.
 *
 * Setup: create a Site at https://dash.cloudflare.com/?to=/:account/turnstile,
 * then set `NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAA...` in your `.env.local`.
 * Without that env var the widget renders nothing and the host page should
 * skip token validation (i.e. captcha is opt-in per deployment).
 *
 * Usage:
 *   const tokenRef = useRef<string | null>(null);
 *   <TurnstileWidget onSuccess={(t) => (tokenRef.current = t)} />
 *   // then send `cf-turnstile-token` header with the form POST
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
        },
      ) => string | undefined;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_ID = "cf-turnstile-script";

interface Props {
  onSuccess: (token: string) => void;
  onExpired?: () => void;
  onError?: () => void;
  theme?: "light" | "dark" | "auto";
}

/** Returns whether Turnstile is configured for this environment. */
export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export function TurnstileWidget({ onSuccess, onExpired, onError, theme = "auto" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!sitekey || !containerRef.current) return;

    let cancelled = false;

    function render() {
      if (cancelled || !window.turnstile || !containerRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: sitekey!,
        theme,
        size: "flexible",
        callback: (token) => onSuccess(token),
        "expired-callback": () => onExpired?.(),
        "error-callback": () => onError?.(),
      });
    }

    if (window.turnstile) {
      render();
    } else if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = render;
      document.head.appendChild(script);
    } else {
      // Script tag already in the DOM, but Turnstile global not ready yet.
      // Poll briefly until it appears.
      const t = setInterval(() => {
        if (window.turnstile) {
          clearInterval(t);
          render();
        }
      }, 200);
      // Safety net so we don't poll forever.
      setTimeout(() => clearInterval(t), 8000);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
      }
    };
  }, [onSuccess, onExpired, onError, theme]);

  if (!isTurnstileEnabled()) return null;
  return <div ref={containerRef} style={{ minHeight: 65, marginTop: 4 }} />;
}
