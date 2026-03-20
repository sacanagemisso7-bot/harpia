import { env } from "@/lib/env";

type ObservabilityEvent = {
  type: string;
  timestamp?: string;
  payload: Record<string, unknown>;
};

export function isObservabilityConfigured() {
  return !!env.OBSERVABILITY_WEBHOOK_URL;
}

export async function forwardObservabilityEvent(event: ObservabilityEvent) {
  if (!env.OBSERVABILITY_WEBHOOK_URL) {
    return;
  }

  await fetch(env.OBSERVABILITY_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      service: env.OBSERVABILITY_SERVICE_NAME,
      type: event.type,
      timestamp: event.timestamp ?? new Date().toISOString(),
      payload: event.payload
    }),
    cache: "no-store"
  });
}
