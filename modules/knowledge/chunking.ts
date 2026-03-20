function normalizeWhitespace(value: string) {
  return value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

export function buildKnowledgeChunks(text: string, chunkSize = 1200, overlap = 180) {
  const normalized = normalizeWhitespace(text);
  const chunks: string[] = [];

  if (!normalized.length) {
    return chunks;
  }

  let cursor = 0;

  while (cursor < normalized.length) {
    const sliceEnd = Math.min(normalized.length, cursor + chunkSize);
    const slice = normalized.slice(cursor, sliceEnd).trim();

    if (slice.length) {
      chunks.push(slice);
    }

    if (sliceEnd >= normalized.length) {
      break;
    }

    cursor = Math.max(sliceEnd - overlap, cursor + 1);
  }

  return chunks;
}

export function extractKeywords(text: string, maxKeywords = 8) {
  const stopWords = new Set([
    "para",
    "como",
    "com",
    "que",
    "uma",
    "das",
    "dos",
    "and",
    "the",
    "for",
    "with",
    "this",
    "that",
    "from"
  ]);

  const counts = new Map<string, number>();

  for (const word of text.toLowerCase().match(/[a-z0-9-]{4,}/g) ?? []) {
    if (stopWords.has(word)) {
      continue;
    }

    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, maxKeywords)
    .map(([keyword]) => keyword);
}
