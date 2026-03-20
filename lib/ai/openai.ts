import OpenAI from "openai";

import { getAiApiKey, getAiBaseUrl, getAiDefaultHeaders, getAiProvider } from "@/lib/ai/config";

let client: OpenAI | null = null;
let cachedApiKey: string | null = null;
let cachedBaseUrl: string | null = null;

export function getOpenAIClient() {
  const apiKey = getAiApiKey();
  const baseURL = getAiBaseUrl() ?? null;

  if (!apiKey) {
    throw new Error(`${getAiProvider()} API key is not configured.`);
  }

  if (!client || cachedApiKey !== apiKey || cachedBaseUrl !== baseURL) {
    client = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
      ...(getAiDefaultHeaders() ? { defaultHeaders: getAiDefaultHeaders() } : {})
    });
    cachedApiKey = apiKey;
    cachedBaseUrl = baseURL;
  }

  return client;
}
