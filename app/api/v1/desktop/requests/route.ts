import { NextResponse } from "next/server";

import { requireDesktopApiUser } from "@/lib/auth/desktop-session";
import { getHrRequestQueueSummary } from "@/modules/hr-requests/queries";

export async function GET(request: Request) {
  const user = await requireDesktopApiUser(request, "view_hr_requests");

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const requests = await getHrRequestQueueSummary(user.organizationId);

  return NextResponse.json({
    ok: true,
    requests: requests.requests.map((request) => ({
      id: request.id,
      title: request.title,
      status: request.status,
      category: request.category,
      priority: request.priority,
      effectiveSlaStatus: request.effectiveSlaStatus,
      dueAt: request.dueAt ? request.dueAt.toISOString() : null,
      assigneeName: request.assigneeUser?.name ?? null,
      requesterName: request.requesterEmployee?.fullName ?? request.requesterUser?.name ?? null
    }))
  });
}
