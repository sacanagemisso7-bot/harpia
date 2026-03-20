import { env } from "@/lib/env";

const GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

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
      "x-goog-api-client": "hireflow-ai/0.1.0"
    };
  }

  return undefined;
}
