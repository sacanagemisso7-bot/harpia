import { NextResponse } from "next/server";

import { handleStripeWebhookEvent, verifyStripeWebhookSignature } from "@/lib/billing/stripe";
import { env } from "@/lib/env";
import { logError } from "@/lib/observability/logger";

export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "Stripe webhook nao configurado." }, { status: 503 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!verifyStripeWebhookSignature(payload, signature)) {
    return NextResponse.json({ ok: false, error: "Assinatura invalida." }, { status: 400 });
  }

  try {
    const event = JSON.parse(payload) as Parameters<typeof handleStripeWebhookEvent>[0];
    await handleStripeWebhookEvent(event);

    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("Failed to process Stripe webhook", error, undefined, "billing");
    return NextResponse.json({ ok: false, error: "Falha ao processar webhook." }, { status: 500 });
  }
}
