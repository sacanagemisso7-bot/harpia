import { prisma } from "@/lib/prisma/client";
import { getAiProvider, isAiConfigured } from "@/lib/ai/config";
import { env } from "@/lib/env";
import { isEmailConfigured } from "@/lib/email/transporter";
import { isObservabilityConfigured } from "@/lib/observability/forwarder";
import { getStorageDriver, isS3Configured } from "@/lib/storage/provider";

const bootedAt = Date.now();

export function getLivenessPayload() {
  return {
    status: "ok",
    service: "hireflow-ai",
    uptimeSeconds: Math.round((Date.now() - bootedAt) / 1000),
    timestamp: new Date().toISOString()
  };
}

export async function getReadinessPayload() {
  const dbStartedAt = Date.now();
  const dbHealthy = await prisma.$queryRaw`SELECT 1`;
  const storageDriver = getStorageDriver();
  const aiReady = isAiConfigured();
  const smtpReady = isEmailConfigured();
  const storageReady = storageDriver === "local" ? true : isS3Configured();

  return {
    status: dbHealthy ? "ready" : "degraded",
    timestamp: new Date().toISOString(),
    dependencies: {
      database: {
        ready: true,
        required: true,
        latencyMs: Date.now() - dbStartedAt
      },
      ai: {
        ready: aiReady,
        required: false,
        provider: getAiProvider()
      },
      smtp: {
        ready: smtpReady,
        required: false
      },
      observability: {
        ready: isObservabilityConfigured(),
        required: false,
        service: env.OBSERVABILITY_SERVICE_NAME
      },
      storage: {
        driver: storageDriver,
        ready: storageReady,
        required: true
      }
    }
  };
}
