import type { KnowledgeDocument, KnowledgeDocumentType } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";

const KNOWLEDGE_STOP_WORDS = new Set([
  "a",
  "ao",
  "aos",
  "as",
  "com",
  "como",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "ou",
  "para",
  "por",
  "pra",
  "que",
  "se",
  "sem",
  "sobre",
  "uma",
  "um"
]);

export type KnowledgeCitation = {
  id: string;
  documentId: string;
  chunkId: string | null;
  title: string;
  excerpt: string;
  href: string | null;
  type: KnowledgeDocumentType;
  position: number | null;
  score: number;
};

export type PolicyRolloutOverviewItem = {
  id: string;
  title: string;
  status: string;
  dueAt: Date | null;
  launchedAt: Date;
  document: {
    id: string;
    title: string;
    versionLabel: string | null;
    publishedAt: Date | null;
    supersedesDocumentTitle: string | null;
  };
  metrics: {
    assigned: number;
    acknowledged: number;
    overdue: number;
    pending: number;
    acceptanceRate: number;
  };
};

function normalizeKnowledgeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenizeKnowledgeQuery(query: string) {
  return Array.from(
    new Set(
      normalizeKnowledgeText(query)
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !KNOWLEDGE_STOP_WORDS.has(token))
    )
  ).slice(0, 8);
}

function countTokenMatches(text: string, tokens: string[]) {
  const normalized = normalizeKnowledgeText(text);
  return tokens.reduce((total, token) => total + (normalized.includes(token) ? 1 : 0), 0);
}

function buildKnowledgeExcerpt(content: string, query: string, tokens: string[]) {
  const collapsed = content.replace(/\s+/g, " ").trim();

  if (!collapsed) {
    return "";
  }

  const normalized = normalizeKnowledgeText(collapsed);
  const searchTerms = [normalizeKnowledgeText(query.trim()), ...tokens].filter(Boolean);
  const firstMatchIndex = searchTerms.reduce((bestIndex, term) => {
    const index = normalized.indexOf(term);

    if (index === -1) {
      return bestIndex;
    }

    if (bestIndex === -1) {
      return index;
    }

    return Math.min(bestIndex, index);
  }, -1);

  if (firstMatchIndex === -1) {
    return collapsed.slice(0, 240);
  }

  const start = Math.max(0, firstMatchIndex - 80);
  const end = Math.min(collapsed.length, firstMatchIndex + 180);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < collapsed.length ? "..." : "";

  return `${prefix}${collapsed.slice(start, end).trim()}${suffix}`;
}

function scoreKnowledgeDocument(document: Pick<KnowledgeDocument, "title" | "summary" | "description" | "updatedAt">, query: string, tokens: string[]) {
  const normalizedQuery = normalizeKnowledgeText(query.trim());
  const exactTitleMatch = normalizedQuery && normalizeKnowledgeText(document.title).includes(normalizedQuery) ? 9 : 0;
  const exactSummaryMatch =
    normalizedQuery && document.summary && normalizeKnowledgeText(document.summary).includes(normalizedQuery) ? 5 : 0;
  const tokenMatches =
    countTokenMatches(document.title, tokens) * 4 +
    countTokenMatches(document.summary ?? "", tokens) * 2 +
    countTokenMatches(document.description ?? "", tokens);
  const freshnessBoost = Date.now() - document.updatedAt.getTime() < 1000 * 60 * 60 * 24 * 30 ? 1 : 0;

  return exactTitleMatch + exactSummaryMatch + tokenMatches + freshnessBoost;
}

function buildRolloutMetrics(
  acknowledgements: Array<{
    acknowledgedAt: Date | null;
    dueAt: Date | null;
  }>
) {
  const assigned = acknowledgements.length;
  const acknowledged = acknowledgements.filter((item) => !!item.acknowledgedAt).length;
  const overdue = acknowledgements.filter((item) => !item.acknowledgedAt && item.dueAt && item.dueAt.getTime() < Date.now()).length;
  const pending = assigned - acknowledged;

  return {
    assigned,
    acknowledged,
    overdue,
    pending,
    acceptanceRate: assigned ? Math.round((acknowledged / assigned) * 100) : 0
  };
}

export async function getKnowledgeOverview(organizationId: string) {
  const [documents, processingCount, readyCount, chunkCount] = await Promise.all([
    prisma.knowledgeDocument.findMany({
      where: {
        organizationId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        supersedesDocument: {
          select: {
            id: true,
            title: true,
            versionLabel: true
          }
        },
        supersededByDocuments: {
          select: {
            id: true,
            title: true,
            versionLabel: true,
            publishedAt: true
          },
          orderBy: [{ publishedAt: "desc" }]
        },
        policyRollouts: {
          include: {
            acknowledgements: {
              select: {
                id: true,
                acknowledgedAt: true,
                dueAt: true
              }
            }
          },
          orderBy: [{ launchedAt: "desc" }],
          take: 3
        },
        _count: {
          select: {
            chunks: true
          }
        }
      },
      orderBy: [{ updatedAt: "desc" }]
    }),
    prisma.knowledgeDocument.count({
      where: {
        organizationId,
        status: "PROCESSING"
      }
    }),
    prisma.knowledgeDocument.count({
      where: {
        organizationId,
        status: "READY"
      }
    }),
    prisma.knowledgeChunk.count({
      where: {
        organizationId
      }
    })
  ]);

  return {
    documents,
    metrics: {
      totalDocuments: documents.length,
      processingCount,
      readyCount,
      chunkCount
    }
  };
}

export async function listPolicyDocumentsForSelect(organizationId: string, options?: { publishedOnly?: boolean }) {
  return prisma.knowledgeDocument.findMany({
    where: {
      organizationId,
      status: "READY",
      type: "POLICY",
      ...(options?.publishedOnly ? { publishedAt: { not: null } } : {})
    },
    select: {
      id: true,
      title: true,
      summary: true,
      versionLabel: true,
      publishedAt: true,
      requiresAcknowledgement: true,
      supersedesDocument: {
        select: {
          id: true,
          title: true,
          versionLabel: true
        }
      }
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }]
  });
}

export async function getPolicyRolloutOverview(organizationId: string) {
  const rollouts = await prisma.policyRollout.findMany({
    where: {
      organizationId
    },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          versionLabel: true,
          publishedAt: true,
          supersedesDocument: {
            select: {
              title: true
            }
          }
        }
      },
      acknowledgements: {
        select: {
          id: true,
          acknowledgedAt: true,
          dueAt: true
        }
      }
    },
    orderBy: [{ launchedAt: "desc" }],
    take: 12
  });

  return rollouts.map<PolicyRolloutOverviewItem>((rollout) => ({
    id: rollout.id,
    title: rollout.title,
    status: rollout.status,
    dueAt: rollout.dueAt,
    launchedAt: rollout.launchedAt,
    document: {
      id: rollout.document.id,
      title: rollout.document.title,
      versionLabel: rollout.document.versionLabel,
      publishedAt: rollout.document.publishedAt,
      supersedesDocumentTitle: rollout.document.supersedesDocument?.title ?? null
    },
    metrics: buildRolloutMetrics(rollout.acknowledgements)
  }));
}

export async function searchKnowledgeEvidence(organizationId: string, query: string, limit = 4) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const tokens = tokenizeKnowledgeQuery(normalizedQuery);
  const searchTerms = [normalizedQuery, ...tokens].filter(Boolean);

  if (!searchTerms.length) {
    return [];
  }

  const where = {
    organizationId,
    document: {
      is: {
        status: "READY" as const
      }
    },
    OR: searchTerms.flatMap((term) => [
      {
        content: {
          contains: term,
          mode: "insensitive" as const
        }
      },
      {
        document: {
          is: {
            title: {
              contains: term,
              mode: "insensitive" as const
            }
          }
        }
      },
      {
        document: {
          is: {
            summary: {
              contains: term,
              mode: "insensitive" as const
            }
          }
        }
      },
      {
        document: {
          is: {
            description: {
              contains: term,
              mode: "insensitive" as const
            }
          }
        }
      }
    ])
  };

  const chunks = await prisma.knowledgeChunk.findMany({
    where,
    include: {
      document: {
        select: {
          id: true,
          title: true,
          type: true,
          summary: true,
          description: true,
          updatedAt: true
        }
      }
    },
    take: Math.max(limit * 6, 12),
    orderBy: [{ createdAt: "desc" }]
  });

  const scored = chunks
    .map((chunk) => {
      const exactChunkMatch = normalizeKnowledgeText(chunk.content).includes(normalizeKnowledgeText(normalizedQuery)) ? 12 : 0;
      const chunkTokenMatches = countTokenMatches(chunk.content, tokens) * 3;
      const documentScore = scoreKnowledgeDocument(chunk.document, normalizedQuery, tokens);

      return {
        id: chunk.id,
        documentId: chunk.document.id,
        chunkId: chunk.id,
        title: chunk.document.title,
        excerpt: buildKnowledgeExcerpt(chunk.content, normalizedQuery, tokens),
        href: "/knowledge",
        type: chunk.document.type,
        position: chunk.position,
        score: exactChunkMatch + chunkTokenMatches + documentScore
      } satisfies KnowledgeCitation;
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  const deduped: KnowledgeCitation[] = [];
  const seenKeys = new Set<string>();

  for (const citation of scored) {
    const key = `${citation.documentId}:${citation.position ?? "document"}`;

    if (seenKeys.has(key)) {
      continue;
    }

    deduped.push(citation);
    seenKeys.add(key);

    if (deduped.length >= limit) {
      break;
    }
  }

  return deduped;
}

export async function searchKnowledgeDocuments(organizationId: string, query: string, limit = 5) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const tokens = tokenizeKnowledgeQuery(normalizedQuery);
  const evidence = await searchKnowledgeEvidence(organizationId, normalizedQuery, limit);
  const evidenceDocumentIds = evidence.map((item) => item.documentId);

  const documents = await prisma.knowledgeDocument.findMany({
    where: {
      organizationId,
      status: "READY",
      OR: [
        {
          id: {
            in: evidenceDocumentIds.length ? evidenceDocumentIds : ["__none__"]
          }
        },
        {
          title: {
            contains: normalizedQuery,
            mode: "insensitive"
          }
        },
        {
          description: {
            contains: normalizedQuery,
            mode: "insensitive"
          }
        },
        {
          summary: {
            contains: normalizedQuery,
            mode: "insensitive"
          }
        },
        ...tokens.flatMap((token) => [
          {
            title: {
              contains: token,
              mode: "insensitive" as const
            }
          },
          {
            summary: {
              contains: token,
              mode: "insensitive" as const
            }
          },
          {
            description: {
              contains: token,
              mode: "insensitive" as const
            }
          }
        ])
      ]
    },
    take: Math.max(limit * 2, 8),
    orderBy: [{ updatedAt: "desc" }]
  });

  const evidenceRank = new Map(evidence.map((citation, index) => [citation.documentId, index]));

  return documents
    .map((document) => ({
      document,
      score:
        scoreKnowledgeDocument(document, normalizedQuery, tokens) +
        (evidenceRank.has(document.id) ? 20 - (evidenceRank.get(document.id) ?? 0) : 0)
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((item) => item.document);
}
