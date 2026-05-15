// Sentry — browser SDK. No-op when NEXT_PUBLIC_SENTRY_DSN is empty,
// so local dev stays quiet and we don't ship noise from contributors.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? "development",
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_RATE ?? "0.1"),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Don't capture spammy network errors caused by client adblockers or offline tabs.
    ignoreErrors: [
      "TypeError: Failed to fetch",
      "NetworkError when attempting to fetch resource",
      "AbortError",
    ],
  });
}
