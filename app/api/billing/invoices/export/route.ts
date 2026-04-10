import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getActiveOrganizationCookie } from "@/lib/auth/organization-context";
import { hasPlanFeature } from "@/lib/billing/features";
import { listStripeInvoices, isStripeConfigured } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma/client";

function escapeCsv(value: string | number | null | undefined) {
  const normalized = value == null ? "" : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id
    },
    include: {
      memberships: {
        include: {
          organization: true
        }
      }
    }
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const activeOrganizationId = await getActiveOrganizationCookie();
  const membership =
    user.memberships.find((item) => item.organizationId === activeOrganizationId) ??
    user.memberships.find((item) => item.organizationId === user.organizationId) ??
    user.memberships[0];

  if (!membership || !hasPermission(membership.role, "manage_workspace")) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (!isStripeConfigured() || !membership.organization.stripeCustomerId) {
    return NextResponse.json({ ok: false, error: "Stripe not configured" }, { status: 400 });
  }

  if (!hasPlanFeature(membership.organization.billingPlan, "invoice_history")) {
    return NextResponse.json({ ok: false, error: "Invoice history unavailable for current plan" }, { status: 403 });
  }

  const invoices = await listStripeInvoices(membership.organization.stripeCustomerId, 50);
  const header = ["invoice_id", "number", "status", "created_at", "amount_paid", "amount_due", "currency", "hosted_invoice_url"];
  const lines = [
    header.map((item) => escapeCsv(item)).join(","),
    ...invoices.map((invoice) =>
      [
        invoice.id,
        invoice.number,
        invoice.status,
        new Date(invoice.created * 1000).toISOString(),
        invoice.amount_paid,
        invoice.amount_due,
        invoice.currency,
        invoice.hosted_invoice_url
      ]
        .map((item) => escapeCsv(item))
        .join(",")
    )
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="harpia-invoices.csv"'
    }
  });
}
