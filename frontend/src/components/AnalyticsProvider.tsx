"use client";

import { useEffect } from "react";
import { getConsent } from "@/components/CookieConsent";

/**
 * Loads PostHog only AFTER the user accepts the "analytics" cookie category.
 *
 * Why we hand-roll the snippet:
 *   - Avoids pulling `posthog-js` into the main bundle (it's >100 KB).
 *   - Lets us defer the script until consent is granted so EU visitors who
 *     decline don't get analytics cookies at all.
 *
 * Setup: set `NEXT_PUBLIC_POSTHOG_KEY` (and optionally
 * `NEXT_PUBLIC_POSTHOG_HOST`, default `https://us.i.posthog.com`). Without
 * those env vars this component is a no-op.
 */

const SNIPPET_ID = "ph-snippet";

function injectPostHog(key: string, host: string) {
  if (typeof window === "undefined") return;
  if (document.getElementById(SNIPPET_ID)) return;

  // Standard PostHog JS snippet inlined so we own the lifecycle.
  // Source: https://posthog.com/docs/libraries/js#install
  const s = document.createElement("script");
  s.id = SNIPPET_ID;
  s.async = true;
  s.innerHTML = `
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('${key}', { api_host: '${host}', persistence: 'localStorage+cookie', autocapture: { dom_event_allowlist: ['click','submit'] } });
  `;
  document.head.appendChild(s);
}

export function AnalyticsProvider() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

    function maybeInject() {
      if (getConsent().analytics) injectPostHog(key!, host);
    }

    // Inject now if consent already given on a previous visit.
    maybeInject();
    // Re-check when the user updates their cookie preferences.
    window.addEventListener("sl:consent-changed", maybeInject as EventListener);
    return () => window.removeEventListener("sl:consent-changed", maybeInject as EventListener);
  }, []);

  return null;
}
