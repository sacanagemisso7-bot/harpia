import { NextResponse } from "next/server";

import { requireDesktopApiUser } from "@/lib/auth/desktop-session";
import { getDesktopOperationalHome } from "@/modules/desktop/queries";

export async function GET(request: Request) {
  const user = await requireDesktopApiUser(request, "view_people_command_center");

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const home = await getDesktopOperationalHome(user.organizationId);

  return NextResponse.json({
    ok: true,
    user,
    home: {
      metrics: home.dashboard.metrics,
      alerts: home.dashboard.alerts,
      hiring: home.dashboard.hiring
    },
    tasks: home.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueAt: task.dueAt ? task.dueAt.toISOString() : null,
      sourceType: task.sourceType,
      assigneeName: task.assigneeUser?.name ?? task.assigneeEmployee?.fullName ?? null,
      relatedEmployeeName: task.relatedEmployee?.fullName ?? null
    })),
    requests: home.requests.map((request) => ({
      id: request.id,
      title: request.title,
      status: request.status,
      category: request.category,
      priority: request.priority,
      effectiveSlaStatus: request.effectiveSlaStatus,
      dueAt: request.dueAt ? request.dueAt.toISOString() : null,
      assigneeName: request.assigneeUser?.name ?? null,
      requesterName: request.requesterEmployee?.fullName ?? request.requesterUser?.name ?? null
    })),
    events: home.events.map((event) => ({
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
