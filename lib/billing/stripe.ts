import { BillingPlan, BillingStatus, type Organization } from "@prisma/client";
import { createHmac, timingSafeEqual } from "crypto";

import { createAuditEvent } from "@/lib/audit/events";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";

type StripeCheckoutSession = {
  id: string;
  url: string | null;
};

type StripePortalSession = {
  id: string;
  url: string;
};

type StripeInvoice = {
  id: string;
  status: string | null;
  amount_paid: number;
  amount_due: number;
  currency: string;
  created: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  number: string | null;
};

type StripeInvoiceList = {
  data: StripeInvoice[];
};

type StripeSubscriptionObject = {
  id: string;
  status: string;
  customer: string;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
      };
    }>;
  };
  current_period_end?: number;
};

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

export type BillingInterval = "monthly" | "annual";

const STRIPE_API_URL = "https://api.stripe.com/v1";

export function isStripeConfigured() {
  return !!env.STRIPE_SECRET_KEY;
}

export function getStripePriceIdForPlan(plan: BillingPlan, interval: BillingInterval = "monthly") {
  if (plan === BillingPlan.STARTER) {
    return interval === "annual" ? env.STRIPE_PRICE_STARTER_ANNUAL : env.STRIPE_PRICE_STARTER_MONTHLY;
  }

  if (plan === BillingPlan.GROWTH) {
    return interval === "annual" ? env.STRIPE_PRICE_GROWTH_ANNUAL : env.STRIPE_PRICE_GROWTH_MONTHLY;
  }

  return interval === "annual" ? env.STRIPE_PRICE_BUSINESS_ANNUAL : env.STRIPE_PRICE_BUSINESS_MONTHLY;
}

export function isStripePlanAvailable(plan: BillingPlan, interval: BillingInterval = "monthly") {
  return !!getStripePriceIdForPlan(plan, interval);
}

async function stripeRequest<T>(path: string, body: URLSearchParams) {
  const response = await fetch(`${STRIPE_API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Stripe request failed: ${payload}`);
  }

  return (await response.json()) as T;
}

async function stripeGet<T>(path: string, query?: URLSearchParams) {
  const suffix = query?.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`${STRIPE_API_URL}${path}${suffix}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Stripe request failed: ${payload}`);
  }

  return (await response.json()) as T;
}

export async function ensureStripeCustomer(organization: Pick<Organization, "id" | "name" | "stripeCustomerId">) {
  if (organization.stripeCustomerId) {
    return organization.stripeCustomerId;
  }

  const params = new URLSearchParams();
  params.set("name", organization.name);
  params.set("metadata[organizationId]", organization.id);

  const customer = await stripeRequest<{ id: string }>("/customers", params);

  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      stripeCustomerId: customer.id
    }
  });

  return customer.id;
}

export async function createStripeCheckoutSession(
  organization: Pick<Organization, "id" | "name" | "stripeCustomerId">,
  plan: BillingPlan,
  interval: BillingInterval = "monthly"
) {
  const priceId = getStripePriceIdForPlan(plan, interval);

  if (!priceId) {
    throw new Error("Plano ainda nao possui price id configurado no Stripe.");
  }

  const customerId = await ensureStripeCustomer(organization);
  const params = new URLSearchParams();

  params.set("mode", "subscription");
  params.set("customer", customerId);
  params.set("success_url", `${env.APP_URL}/settings/billing?billing=success`);
  params.set("cancel_url", `${env.APP_URL}/pricing?billing=cancelled`);
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("allow_promotion_codes", "true");
  params.set("metadata[organizationId]", organization.id);
  params.set("metadata[plan]", plan);
  params.set("metadata[interval]", interval);
  params.set("subscription_data[metadata][organizationId]", organization.id);
  params.set("subscription_data[metadata][plan]", plan);
  params.set("subscription_data[metadata][interval]", interval);

  return stripeRequest<StripeCheckoutSession>("/checkout/sessions", params);
}

export async function createStripeBillingPortalSession(
  organization: Pick<Organization, "id" | "stripeCustomerId">
) {
  if (!organization.stripeCustomerId) {
    throw new Error("Nenhum customer do Stripe configurado para esta organizacao.");
  }

  const params = new URLSearchParams();
  params.set("customer", organization.stripeCustomerId);
  params.set("return_url", `${env.APP_URL}/settings/billing?billing=portal`);

  return stripeRequest<StripePortalSession>("/billing_portal/sessions", params);
}

export async function listStripeInvoices(customerId: string, limit = 12) {
  const query = new URLSearchParams();
  query.set("customer", customerId);
  query.set("limit", String(limit));

  const invoices = await stripeGet<StripeInvoiceList>("/invoices", query);
  return invoices.data;
}

function mapStripeSubscriptionStatus(status: string): BillingStatus {
  if (status === "trialing") {
    return BillingStatus.TRIALING;
  }

  if (status === "active") {
    return BillingStatus.ACTIVE;
  }

  if (status === "past_due" || status === "unpaid") {
    return BillingStatus.PAST_DUE;
  }

  if (status === "canceled" || status === "incomplete_expired") {
    return BillingStatus.CANCELED;
  }

  return BillingStatus.INCOMPLETE;
}

function mapPlanFromStripePrice(priceId?: string | null) {
  if (priceId && [env.STRIPE_PRICE_GROWTH_MONTHLY, env.STRIPE_PRICE_GROWTH_ANNUAL].includes(priceId)) {
    return BillingPlan.GROWTH;
  }

  if (priceId && [env.STRIPE_PRICE_BUSINESS_MONTHLY, env.STRIPE_PRICE_BUSINESS_ANNUAL].includes(priceId)) {
    return BillingPlan.BUSINESS;
  }

  return BillingPlan.STARTER;
}

export async function syncOrganizationFromStripeSubscription(
  customerId: string,
  subscription: StripeSubscriptionObject
) {
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const organizations = await prisma.organization.findMany({
    where: {
      stripeCustomerId: customerId
    }
  });

  if (!organizations.length) {
    return;
  }

  const nextStatus = mapStripeSubscriptionStatus(subscription.status);
  const nextPlan = mapPlanFromStripePrice(priceId);

  await prisma.organization.updateMany({
    where: {
      stripeCustomerId: customerId
    },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      billingPlan: nextPlan,
      billingStatus: nextStatus,
      billingTrialEndsAt: subscription.status === "trialing" && subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
      billingCurrentPeriodEndsAt: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null
    }
  });

  for (const organization of organizations) {
    if (organization.billingStatus !== nextStatus || organization.billingPlan !== nextPlan) {
      await createAuditEvent({
        organizationId: organization.id,
        action: "billing.subscription_synced",
        entityType: "organization",
        entityId: organization.id,
        summary: `Assinatura sincronizada para ${nextPlan} com status ${nextStatus}.`,
        metadata: {
          previousStatus: organization.billingStatus,
          nextStatus,
          previousPlan: organization.billingPlan,
          nextPlan,
          stripeSubscriptionId: subscription.id
        }
      });
    }

    if (organization.billingStatus !== BillingStatus.ACTIVE && nextStatus === BillingStatus.ACTIVE) {
      await createAuditEvent({
        organizationId: organization.id,
        action: "billing.subscription_activated",
        entityType: "organization",
        entityId: organization.id,
        summary: `Workspace ativado no plano ${nextPlan}.`,
        metadata: {
          billingPlan: nextPlan,
          stripeSubscriptionId: subscription.id
        }
      });
    }

    if (organization.billingStatus !== BillingStatus.PAST_DUE && nextStatus === BillingStatus.PAST_DUE) {
      await createAuditEvent({
        organizationId: organization.id,
        action: "billing.subscription_past_due",
        entityType: "organization",
        entityId: organization.id,
        summary: "Assinatura entrou em estado pendente.",
        metadata: {
          billingPlan: nextPlan,
          stripeSubscriptionId: subscription.id
        }
      });
    }
  }
}

export async function markOrganizationSubscriptionCanceled(customerId: string) {
  const organizations = await prisma.organization.findMany({
    where: {
      stripeCustomerId: customerId
    }
  });

  await prisma.organization.updateMany({
    where: {
      stripeCustomerId: customerId
    },
    data: {
      billingStatus: BillingStatus.CANCELED,
      stripeSubscriptionId: null,
      billingCurrentPeriodEndsAt: null
    }
  });

  for (const organization of organizations) {
    await createAuditEvent({
      organizationId: organization.id,
      action: "billing.subscription_canceled",
      entityType: "organization",
      entityId: organization.id,
      summary: "Assinatura cancelada no provedor de billing.",
      metadata: {
        previousStatus: organization.billingStatus,
        previousPlan: organization.billingPlan
      }
    });
  }
}

export function verifyStripeWebhookSignature(payload: string, signatureHeader: string | null) {
  if (!signatureHeader || !env.STRIPE_WEBHOOK_SECRET) {
    return false;
  }

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((accumulator, item) => {
    const [key, value] = item.split("=");
    if (key && value) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});

  if (!parts.t || !parts.v1) {
    return false;
  }

  const signedPayload = `${parts.t}.${payload}`;
  const expected = createHmac("sha256", env.STRIPE_WEBHOOK_SECRET).update(signedPayload, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(parts.v1, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function handleStripeWebhookEvent(event: StripeEvent) {
  if (event.type === "checkout.session.completed") {
    const object = event.data.object as {
      customer?: string;
      subscription?: string;
      metadata?: {
        organizationId?: string;
        plan?: string;
        interval?: string;
      };
    };

    if (object.metadata?.organizationId) {
      await prisma.organization.update({
        where: {
          id: object.metadata.organizationId
        },
        data: {
          stripeCustomerId: object.customer ?? null,
          stripeSubscriptionId: object.subscription ?? null,
          billingPlan: (object.metadata.plan as BillingPlan | undefined) ?? BillingPlan.STARTER,
          billingStatus: BillingStatus.ACTIVE,
          billingTrialEndsAt: null
        }
      });

      await createAuditEvent({
        organizationId: object.metadata.organizationId,
        action: "billing.checkout_completed",
        entityType: "organization",
        entityId: object.metadata.organizationId,
        summary: `Checkout concluido para o plano ${object.metadata.plan ?? BillingPlan.STARTER}.`,
        metadata: {
          billingPlan: object.metadata.plan ?? BillingPlan.STARTER,
          interval: object.metadata.interval ?? "monthly",
          stripeCustomerId: object.customer ?? null,
          stripeSubscriptionId: object.subscription ?? null
        }
      });
    }

    return;
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const subscription = event.data.object as StripeSubscriptionObject;

    if (typeof subscription.customer === "string") {
      await syncOrganizationFromStripeSubscription(subscription.customer, subscription);
    }

    return;
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as StripeSubscriptionObject;

    if (typeof subscription.customer === "string") {
      await markOrganizationSubscriptionCanceled(subscription.customer);
    }
  }
}
