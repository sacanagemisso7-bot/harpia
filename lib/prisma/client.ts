import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
  var prismaDatasourceWarningShown: boolean | undefined;
}

function normalizePrismaDatasourceUrl(rawUrl: string | undefined) {
  if (!rawUrl) {
    return undefined;
  }

  try {
    const url = new URL(rawUrl);
    const isSupabasePooler = url.hostname.endsWith(".pooler.supabase.com");

    if (!isSupabasePooler) {
      return rawUrl;
    }

    let changed = false;

    if (url.port === "5432") {
      url.port = "6543";
      changed = true;
    }

    if (!url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
      changed = true;
    }

    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
      changed = true;
    }

    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "20");
      changed = true;
    }

    if (changed && process.env.NODE_ENV !== "production" && !global.prismaDatasourceWarningShown) {
      global.prismaDatasourceWarningShown = true;
      console.warn("[prisma] Normalized Supabase pooler URL for Prisma Client runtime.");
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

const datasourceUrl = normalizePrismaDatasourceUrl(process.env.DATABASE_URL);

export const prisma =
  global.prisma ??
  new PrismaClient({
    ...(datasourceUrl
      ? {
          datasources: {
            db: {
              url: datasourceUrl
            }
          }
        }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
