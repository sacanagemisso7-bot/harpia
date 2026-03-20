import { NextResponse } from "next/server";

import { requireDesktopApiUser } from "@/lib/auth/desktop-session";
import { getDesktopOperationalInbox } from "@/modules/desktop/queries";

export async function GET(request: Request) {
  const user = await requireDesktopApiUser(request, "view_people_command_center");

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const inbox = await getDesktopOperationalInbox(user.organizationId);

  return NextResponse.json({
    ok: true,
    inbox
  });
}
