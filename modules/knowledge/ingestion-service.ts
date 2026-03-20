import { BackgroundJobStatus, type BackgroundJob } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { getAiChatModel, isAiConfigured } from "@/lib/ai/config";
import { env } from "@/lib/env";
import { getOpenAIClient } from "@/lib/ai/openai";
import { logError } from "@/lib/observability/logger";
import { prisma } from "@/lib/prisma/client";
import { extractResumeText } from "@/lib/resumes/extract";
import { buildKnowledgeChunks, extractKeywords } from "@/modules/knowledge/chunking";

async function loadStoredDocumentBuffer(storageKey: string) {
  const absolutePath = path.resolve(process.cwd(), env.UPLOAD_DIR, storageKey);
  return readFile(absolutePath);
}

async function buildKnowledgeSummary(title: string, text: string) {
  if (!isAiConfigured()) {
    return text.slice(0, 360);
  }

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: getAiChatModel(),
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You summarize internal company operations documents. Return a concise, factual summary focused on what HR, people ops, managers, and internal operations teams should know."
        },
        {
          role: "user",
          content: `Document title: ${title}\n\nContent:\n${text.slice(0, 12000)}`
        }
      ]
    });

    return completion.choices[0]?.message.content?.trim() || text.slice(0, 360);
  } catch (error) {
    logError("Failed to summarize knowledge document", error, { title }, "knowledge");
    return text.slice(0, 360);
  }
}

export async function ingestKnowledgeDocument(documentId: string) {
  const document = await prisma.knowledgeDocument.findUnique({
    where: {
      id: documentId
    }
  });

  if (!document) {
    throw new Error("Knowledge document not found.");
  }

  if (!document.storageKey) {
    throw new Error("Knowledge document storage key is missing.");
  }

  const buffer = await loadStoredDocumentBuffer(document.storageKey);
  const extractedText =
    document.mimeType === "application/pdf" ? await extractResumeText(buffer) : buffer.toString("utf8");
  const chunks = buildKnowledgeChunks(extractedText);
  const summary = await buildKnowledgeSummary(document.title, extractedText);

  await prisma.$transaction([
    prisma.knowledgeChunk.deleteMany({
      where: {
        documentId: document.id
      }
    }),
    prisma.knowledgeDocument.update({
      where: {
        id: document.id
      },
      data: {
        extractedText,
        summary,
        status: "READY",
        processedAt: new Date(),
        lastError: null
      }
    }),
    ...chunks.map((chunk, index) =>
      prisma.knowledgeChunk.create({
        data: {
          organizationId: document.organizationId,
          documentId: document.id,
          position: index,
          content: chunk,
          tokenCount: Math.ceil(chunk.length / 4),
          keywords: extractKeywords(chunk)
        }
      })
    )
  ]);

  return {
    chunkCount: chunks.length,
    summary
  };
}

export async function processKnowledgeIngestionJob(job: BackgroundJob) {
  const payload = job.payload as {
    documentId: string;
  };

  try {
    const result = await ingestKnowledgeDocument(payload.documentId);

    return {
      status: BackgroundJobStatus.SUCCEEDED,
      summary: `Knowledge document ingested with ${result.chunkCount} chunks.`
    };
  } catch (error) {
    await prisma.knowledgeDocument.updateMany({
      where: {
        id: payload.documentId
      },
      data: {
        status: "FAILED",
        lastError: error instanceof Error ? error.message : "Knowledge ingestion failed"
      }
    });

    return {
      status: BackgroundJobStatus.FAILED,
      error: error instanceof Error ? error.message : "Knowledge ingestion failed"
    };
  }
}
