import { apiRequest } from "./queryClient";

export function getAttributionMetadata() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    landingPage: window.location.pathname,
    referrer: document.referrer || undefined,
    utmSource: params.get("utm_source") || undefined,
    utmMedium: params.get("utm_medium") || undefined,
    utmCampaign: params.get("utm_campaign") || undefined,
    utmTerm: params.get("utm_term") || undefined,
    utmContent: params.get("utm_content") || undefined,
  };
}

export function trackConversionEvent(event: string, metadata: Record<string, unknown> = {}) {
  void apiRequest("POST", "/api/analytics/track", {
    event,
    metadata: {
      ...getAttributionMetadata(),
      ...metadata,
    },
  }).catch(() => {
    // Tracking must never block form completion.
  });
}
