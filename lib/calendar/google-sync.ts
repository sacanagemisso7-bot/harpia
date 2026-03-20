import { createSign } from "crypto";

import { env } from "@/lib/env";
import { logError } from "@/lib/observability/logger";

type GoogleCalendarEventInput = {
  summary: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  end: Date;
  attendees?: Array<{ email: string; displayName?: string }>;
};

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function getGooglePrivateKey() {
  return env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replaceAll("\\n", "\n");
}

export function isGoogleCalendarSyncConfigured() {
  return Boolean(env.GOOGLE_CALENDAR_ID && env.GOOGLE_SERVICE_ACCOUNT_EMAIL && getGooglePrivateKey());
}

async function getGoogleAccessToken() {
  const privateKey = getGooglePrivateKey();

  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !privateKey) {
    throw new Error("Google Calendar sync is not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    })
  );

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(privateKey);
  const assertion = `${header}.${payload}.${base64UrlEncode(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  if (!response.ok) {
    throw new Error(`Google token request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

function buildEventPayload(event: GoogleCalendarEventInput) {
  return {
    summary: event.summary,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start: {
      dateTime: event.start.toISOString()
    },
    end: {
      dateTime: event.end.toISOString()
    },
    attendees: event.attendees?.map((attendee) => ({
      email: attendee.email,
      displayName: attendee.displayName
    }))
  };
}

export async function upsertGoogleCalendarEvent(
  event: GoogleCalendarEventInput,
  existingEventId?: string | null
) {
  if (!isGoogleCalendarSyncConfigured()) {
    return null;
  }

  const accessToken = await getGoogleAccessToken();
  const calendarId = encodeURIComponent(env.GOOGLE_CALENDAR_ID!);
  const method = existingEventId ? "PUT" : "POST";
  const path = existingEventId
    ? `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${existingEventId}`
    : `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildEventPayload(event))
  });

  if (!response.ok) {
    throw new Error(`Google Calendar event sync failed with status ${response.status}.`);
  }

  const data = (await response.json()) as { id: string };
  return {
    provider: "google_calendar",
    eventId: data.id
  };
}

export async function deleteGoogleCalendarEvent(eventId: string) {
  if (!isGoogleCalendarSyncConfigured()) {
    return;
  }

  const accessToken = await getGoogleAccessToken();
  const calendarId = encodeURIComponent(env.GOOGLE_CALENDAR_ID!);
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`Google Calendar event delete failed with status ${response.status}.`);
  }
}

export async function syncInterviewToGoogleCalendar(
  event: GoogleCalendarEventInput,
  existingEventId?: string | null
) {
  try {
    return await upsertGoogleCalendarEvent(event, existingEventId);
  } catch (error) {
    logError("Failed to sync Google Calendar event", error, { existingEventId }, "calendar");
    return null;
  }
}

export async function removeInterviewFromGoogleCalendar(eventId?: string | null) {
  if (!eventId) {
    return;
  }

  try {
    await deleteGoogleCalendarEvent(eventId);
  } catch (error) {
    logError("Failed to delete Google Calendar event", error, { eventId }, "calendar");
  }
}
