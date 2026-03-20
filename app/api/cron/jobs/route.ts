import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { logError } from "@/lib/observability/logger";
import { processPendingBackgroundJobs } from "@/modules/background-jobs/service";
import { scheduleWatchtowerSweepJobs } from "@/modules/watchtower/service";

function isAuthorized(request: Request) {
  if (!env.CRON_SECRET) {
    return false;
  }

  const headerSecret = request.headers.get("x-cron-secret");
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  return headerSecret === env.CRON_SECRET || bearerSecret === env.CRON_SECRET;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const scheduled = await scheduleWatchtowerSweepJobs();
    const result = await processPendingBackgroundJobs({
      limit: 25
    });

    return NextResponse.json({
      ok: true,
      scheduled,
      processed: result
    });
  } catch (error) {
    logError("Background jobs cron failed", error, undefined, "background-jobs");
    return NextResponse.json({ ok: false, error: "Failed to process background jobs" }, { status: 500 });
  }
}
