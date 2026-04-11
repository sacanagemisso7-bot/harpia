import { env } from "@/lib/env";

const GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const AI_TEMP_UNAVAILABLE_COOLDOWN_MS = 5 * 60 * 1000;

let aiTemporarilyUnavailableUntil = 0;
let aiTemporaryUnavailableReason: string | null = null;

export function getAiProvider() {
  return env.AI_PROVIDER;
}

export function getAiApiKey() {
  if (env.AI_PROVIDER === "gemini") {
    return env.GEMINI_API_KEY ?? env.OPENAI_API_KEY ?? null;
  }

  return env.OPENAI_API_KEY ?? null;
}

export function isAiConfigured() {
  return Boolean(getAiApiKey());
}

export function isAiTemporarilyUnavailable() {
  return aiTemporarilyUnavailableUntil > Date.now();
}

export function getAiTemporaryUnavailableReason() {
  return isAiTemporarilyUnavailable() ? aiTemporaryUnavailableReason : null;
}

export function markAiTemporarilyUnavailable(reason: string, cooldownMs = AI_TEMP_UNAVAILABLE_COOLDOWN_MS) {
  aiTemporarilyUnavailableUntil = Date.now() + cooldownMs;
  aiTemporaryUnavailableReason = reason;
}

export function clearAiTemporaryUnavailable() {
  aiTemporarilyUnavailableUntil = 0;
  aiTemporaryUnavailableReason = null;
}

export function getAiChatModel() {
  return env.AI_PROVIDER === "gemini" ? env.GEMINI_MODEL : env.OPENAI_CHAT_MODEL;
}

export function getAiResumeModel() {
  return env.AI_PROVIDER === "gemini" ? env.GEMINI_MODEL : env.OPENAI_RESUME_MODEL;
}

export function getAiBaseUrl() {
  if (env.AI_PROVIDER === "gemini") {
    return env.OPENAI_BASE_URL ?? GEMINI_OPENAI_BASE_URL;
  }

  return env.OPENAI_BASE_URL ?? undefined;
}

export function getAiDefaultHeaders() {
  if (env.AI_PROVIDER === "gemini") {
    return {
      "x-goog-api-client": "harpia/1.0.0"
    };
  }

  return undefined;
}
