"use server";

import { revalidatePath } from "next/cache";

import type { KnowledgeUploadState } from "@/components/knowledge/knowledge-upload-form";
import { createAuditEvent } from "@/lib/audit/events";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { storeScopedFile } from "@/lib/storage/provider";
import { knowledgeDocumentUploadSchema, publishPolicyDocumentSchema } from "@/lib/validations/knowledge";
import { enqueueBackgroundJob } from "@/modules/background-jobs/service";

function normalizeOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length ? trimmedValue : undefined;
}

export async function uploadKnowledgeDocument(
  _previousState: KnowledgeUploadState,
  formData: FormData
): Promise<KnowledgeUploadState> {
  const user = await requirePermission("manage_knowledge");
  const file = formData.get("document");

  if (!(file instanceof File)) {
    return {
      error: "Selecione um arquivo para continuar."
    };
  }

  const parsed = knowledgeDocumentUploadSchema.safeParse({
    title: formData.get("title"),
    description: normalizeOptionalString(formData.get("description")),
    type: formData.get("type"),
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Nao foi possivel validar o documento."
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await storeScopedFile({
    organizationId: user.organizationId,
    pathSegments: ["knowledge"],
    fileName: file.name,
    fileBuffer: buffer,
    mimeType: file.type
  });

  const document = await prisma.knowledgeDocument.create({
    data: {
      organizationId: user.organizationId,
      createdById: user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      type: parsed.data.type,
      status: "PROCESSING",
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      storageKey: stored.storageKey,
      sizeBytes: parsed.data.sizeBytes
    }
  });

  await enqueueBackgroundJob({
    organizationId: user.organizationId,
    type: "KNOWLEDGE_INGEST",
    payload: {
      documentId: document.id
    },
    uniqueKey: `knowledge-ingest:${document.id}`
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "knowledge.document_uploaded",
    entityType: "knowledge_document",
    entityId: document.id,
    summary: `Documento ${document.title} enviado para ingestao.`,
    metadata: {
      type: document.type,
      fileName: document.fileName
    }
  });

  revalidatePath("/knowledge");
  revalidatePath("/dashboard");

  return {
    success: "Documento enviado. A ingestao foi iniciada."
  };
}

export async function publishPolicyDocumentVersionAction(formData: FormData) {
  const user = await requirePermission("manage_knowledge");
  const parsed = publishPolicyDocumentSchema.safeParse({
    documentId: formData.get("documentId"),
    versionLabel: normalizeOptionalString(formData.get("versionLabel")),
    supersedesDocumentId: normalizeOptionalString(formData.get("supersedesDocumentId")),
    requiresAcknowledgement: formData.get("requiresAcknowledgement")
  });

  if (!parsed.success) {
    return;
  }

  const document = await prisma.knowledgeDocument.findFirst({
    where: {
      id: parsed.data.documentId,
      organizationId: user.organizationId,
      type: "POLICY",
      status: "READY"
    }
  });

  if (!document) {
    return;
  }

  if (parsed.data.supersedesDocumentId) {
    if (parsed.data.supersedesDocumentId === document.id) {
      return;
    }

    const supersededDocument = await prisma.knowledgeDocument.findFirst({
      where: {
        id: parsed.data.supersedesDocumentId,
        organizationId: user.organizationId,
        type: "POLICY",
        status: "READY"
      },
      select: {
        id: true,
        publishedAt: true
      }
    });

    if (!supersededDocument) {
      return;
    }

    if (!supersededDocument.publishedAt) {
      return;
    }
  }

  await prisma.knowledgeDocument.update({
    where: {
      id: document.id
    },
    data: {
      versionLabel: parsed.data.versionLabel ?? document.versionLabel ?? `v${new Date().getFullYear()}.1`,
      supersedesDocumentId: parsed.data.supersedesDocumentId ?? null,
      requiresAcknowledgement: parsed.data.requiresAcknowledgement,
      publishedAt: document.publishedAt ?? new Date()
    }
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "knowledge.policy_published",
    entityType: "knowledge_document",
    entityId: document.id,
    summary: `Policy publicada: ${document.title}.`,
    metadata: {
      versionLabel: parsed.data.versionLabel ?? document.versionLabel ?? null,
      supersedesDocumentId: parsed.data.supersedesDocumentId ?? null,
      requiresAcknowledgement: parsed.data.requiresAcknowledgement
    }
  });

  revalidatePath("/knowledge");
  revalidatePath("/people/compliance");
  revalidatePath("/dashboard");
}
