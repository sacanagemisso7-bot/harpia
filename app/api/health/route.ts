import { NextResponse } from "next/server";

import { getLivenessPayload } from "@/lib/observability/health";

export async function GET() {
  return NextResponse.json(getLivenessPayload(), { status: 200 });
}
