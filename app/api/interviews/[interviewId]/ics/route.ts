import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getActiveOrganizationCookie } from "@/lib/auth/organization-context";
import { buildInterviewIcs } from "@/lib/calendar/ics";
import { prisma } from "@/lib/prisma/client";

export async function GET(
  _request: Request,
  context: { params: Promise<{ interviewId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const activeOrganizationId = await getActiveOrganizationCookie();
  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id
    },
    include: {
      memberships: true
    }
  });

  const membership =
    user?.memberships.find((item) => item.organizationId === activeOrganizationId) ??
    user?.memberships.find((item) => item.organizationId === user.organizationId) ??
    user?.memberships[0];

  if (!membership) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { interviewId } = await context.params;
  const interview = await prisma.interview.findFirst({
    where: {
      id: interviewId,
      organizationId: membership.organizationId
    },
    include: {
      application: {
        include: {
          job: true
        }
      },
      scheduledBy: true
    }
  });

  if (!interview) {
    return new NextResponse("Not found", { status: 404 });
  }

  const calendarFile = buildInterviewIcs({
    uid: interview.id,
    title: `${interview.title} - ${interview.application.job.title}`,
    startsAt: interview.startsAt,
    endsAt: interview.endsAt,
    description: interview.notes,
    location: interview.location,
    url: interview.meetingUrl,
    organizerName: interview.scheduledBy.name,
    organizerEmail: interview.scheduledBy.email
  });

  return new NextResponse(calendarFile, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="interview-${interview.id}.ics"`
    }
  });
}
