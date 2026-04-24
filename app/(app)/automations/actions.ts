"use server";

import {
  AgentRiskLevel,
  AgentRunMode,
  AgentRunStatus,
  AgentStepStatus,
  Prisma
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { createAuditEvent } from "@/lib/audit/events";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { processPendingBackgroundJobs } from "@/modules/background-jobs/service";
import { scheduleWatchtowerSweepJobs } from "@/modules/watchtower/service";

export type AutomationActionState = {
  error?: string;
  success?: string;
};

const automationPaths = ["/automations", "/dashboard", "/people/tasks", "/people/agent-approvals"];

function revalidateAutomationSurface() {
  for (const path of automationPaths) {
    revalidatePath(path);
  }
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseRisk(value: string): AgentRiskLevel {
  if (value === AgentRiskLevel.HIGH || value === AgentRiskLevel.CRITICAL || value === AgentRiskLevel.LOW) {
    return value;
  }

  return AgentRiskLevel.MEDIUM;
}

export async function runWatchtowerNowAction(
  _previousState: AutomationActionState,
  _formData: FormData
): Promise<AutomationActionState> {
  const user = await requirePermission("view_people_command_center");

  try {
    const queued = await scheduleWatchtowerSweepJobs({
      organizationId: user.organizationId
    });

    const processed = await processPendingBackgroundJobs({
      limit: 12,
      organizationId: user.organizationId
    });

    await createAuditEvent({
      action: "automation.watchtower_run",
      actorId: user.id,
      entityId: user.organizationId,
      entityType: "automation_watchtower",
      metadata: {
        processedJobs: processed,
        queuedJobs: queued.scheduled.length
      },
      organizationId: user.organizationId,
      summary: "Watchtower executado manualmente."
    });

    revalidateAutomationSurface();

    return {
      success: `Varredura executada. ${processed} job(s) processado(s), ${queued.scheduled.length} job(s) preparado(s).`
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "N\u00e3o foi poss\u00edvel rodar a varredura agora."
    };
  }
}

export async function createAutomationDraftAction(
  _previousState: AutomationActionState,
  formData: FormData
): Promise<AutomationActionState> {
  const user = await requirePermission("view_people_command_center");
  const prompt = getString(formData, "prompt");
  const trigger = getString(formData, "trigger") || "Manual";
  const owner = getString(formData, "owner") || "People Ops";
  const riskLevel = parseRisk(getString(formData, "riskLevel"));

  if (prompt.length < 12) {
    return {
      error: "Descreva a automa\u00e7\u00e3o com um pouco mais de contexto."
    };
  }

  const payload: Prisma.InputJsonObject = {
    owner,
    prompt,
    trigger,
    trustLayer: {
      approvalsRequired: riskLevel === AgentRiskLevel.HIGH || riskLevel === AgentRiskLevel.CRITICAL,
      auditTrail: true,
      previewBeforeExecution: true,
      reversibleWhenPossible: true
    }
  };

  try {
    const run = await prisma.agentRun.create({
      data: {
        actionPayload: payload,
        actionType: "automation_rule_draft",
        goal: `Criar rascunho de automa\u00e7\u00e3o: ${prompt}`,
        mode: AgentRunMode.AUTOMATION,
        organizationId: user.organizationId,
        requiresApproval: true,
        riskLevel,
        startedByUserId: user.id,
        status: AgentRunStatus.DRAFT,
        summary: `Rascunho de automa\u00e7\u00e3o: ${prompt.slice(0, 140)}`
      }
    });

    await prisma.agentStep.createMany({
      data: [
        {
          agentRunId: run.id,
          input: {
            prompt,
            trigger
          },
          kind: "planning",
          output: {
            result: "Regra convertida em rascunho audit\u00e1vel."
          },
          status: AgentStepStatus.COMPLETED,
          title: "Interpretar regra"
        },
        {
          agentRunId: run.id,
          input: {
            riskLevel
          },
          kind: "governance",
          output: {
            result: "Execu\u00e7\u00e3o bloqueada at\u00e9 aprova\u00e7\u00e3o humana."
          },
          status: AgentStepStatus.COMPLETED,
          title: "Aplicar camada de confian\u00e7a"
        }
      ]
    });

    await createAuditEvent({
      action: "automation.draft_created",
      actorId: user.id,
      entityId: run.id,
      entityType: "agent_run",
      metadata: payload as Record<string, unknown>,
      organizationId: user.organizationId,
      summary: "Rascunho de automa\u00e7\u00e3o com IA criado."
    });

    revalidateAutomationSurface();

    return {
      success: "Rascunho criado. Ele fica audit\u00e1vel e n\u00e3o executa nada sem aprova\u00e7\u00e3o."
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "N\u00e3o foi poss\u00edvel criar o rascunho."
    };
  }
}
