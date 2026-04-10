type InterviewCalendarEvent = {
  uid: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  organizerName?: string | null;
  organizerEmail?: string | null;
};

function formatDateForIcs(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildInterviewIcs(event: InterviewCalendarEvent) {
  const descriptionParts = [event.description, event.url].filter(Boolean).join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Harpia//Hiring Calendar//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${formatDateForIcs(new Date())}`,
    `DTSTART:${formatDateForIcs(event.startsAt)}`,
    `DTEND:${formatDateForIcs(event.endsAt)}`,
    `SUMMARY:${escapeIcsText(event.title)}`
  ];

  if (descriptionParts) {
    lines.push(`DESCRIPTION:${escapeIcsText(descriptionParts)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }

  if (event.url) {
    lines.push(`URL:${escapeIcsText(event.url)}`);
  }

  if (event.organizerEmail) {
    const organizerName = event.organizerName ? `CN=${escapeIcsText(event.organizerName)}:` : "";
    lines.push(`ORGANIZER;${organizerName}mailto:${event.organizerEmail}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}
