import { NextResponse } from "next/server";

import { requireDesktopApiUser } from "@/lib/auth/desktop-session";
import { listUpcomingPeopleEvents } from "@/modules/people-ops/queries";

export async function GET(request: Request) {
  const user = await requireDesktopApiUser(request, "view_people_calendar");

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const events = await listUpcomingPeopleEvents(user.organizationId, 24);

  return NextResponse.json({
    ok: true,
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      type: event.type,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt ? event.endsAt.toISOString() : null,
      description: event.description ?? null,
      employeeName: event.relatedEmployee?.fullName ?? null
    }))
  });
}
