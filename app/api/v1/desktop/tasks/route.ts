import { NextResponse } from "next/server";

import { requireDesktopApiUser } from "@/lib/auth/desktop-session";
import { listPeopleTasks } from "@/modules/people-tasks/queries";

export async function GET(request: Request) {
  const user = await requireDesktopApiUser(request, "view_people_tasks");

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await listPeopleTasks(user.organizationId);

  return NextResponse.json({
    ok: true,
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueAt: task.dueAt ? task.dueAt.toISOString() : null,
      sourceType: task.sourceType,
      assigneeName: task.assigneeUser?.name ?? task.assigneeEmployee?.fullName ?? null,
      relatedEmployeeName: task.relatedEmployee?.fullName ?? null
    }))
  });
}
