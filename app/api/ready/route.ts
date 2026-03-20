import { NextResponse } from "next/server";

import { getReadinessPayload } from "@/lib/observability/health";
import { logError } from "@/lib/observability/logger";

export async function GET() {
  try {
    const payload = await getReadinessPayload();
    const dependencies = Object.values(payload.dependencies);
    const ready = dependencies.every((dependency) => dependency.required === false || dependency.ready !== false);

    return NextResponse.json(payload, { status: ready ? 200 : 503 });
  } catch (error) {
    logError("Readiness check failed", error, undefined, "health");

    return NextResponse.json(
      {
        status: "failed",
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
