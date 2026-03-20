import {
  AgentRiskLevel,
  AgentRunMode,
  AgentRunStatus,
  AgentStepStatus,
  BackgroundJobStatus,
  BackgroundJobType,
  ComplianceStatus,
  EmployeeCheckInType,
  EmployeeStatus,
  HrRequestStatus,
  PeopleTaskPriority,
  PeopleTaskStatus,
  PeopleWorkflowKind,
  PeopleWorkflowRunStatus,
  PeopleWorkflowStepStatus,
  Prisma,
  SlaStatus,
  type BackgroundJob
} from "@prisma/client";

import { createAuditEvent } from "@/lib/audit/events";
import { sendOperationalEmail } from "@/lib/email/operations";
import { prisma } from "@/lib/prisma/client";
import type { BackgroundJobProcessorResult, JobPayloadMap } from "@/modules/background-jobs/types";
import { getEffectiveSlaStatus } from "@/modules/hr-requests/service";
import { createPeopleTask } from "@/modules/people-tasks/service";

type WatchtowerTaskInput = {
  title: string;
  description: string;
  assigneeUserId?: string | null;
  relatedEmployeeId?: string | null;
  priority: PeopleTaskPriority;
  dueAt?: Date | null;
  sourceType: string;
  sourceId: string;
};

type WatchtowerJobInput<T extends BackgroundJobType> = {
  type: T;
  payload: JobPayloadMap[T];
  uniqueKey: string;
};

type WatchtowerFinding = {
  ruleId: string;
  title: string;
  description: string;
  severity: AgentRiskLevel;
  href: string;
  taskInput?: WatchtowerTaskInput;
  followUpJobs?: Array<
    | WatchtowerJobInput<"PEOPLE_REMINDER">
    | WatchtowerJobInput<"HR_REQUEST_SLA_ALERT">
    | WatchtowerJobInput<"COMPLIANCE_ALERT">
  >;
};

const WATCHTOWER_SWEEP_LIMIT = 50;
const TRACKED_CHECKIN_TYPES: EmployeeCheckInType[] = [
  EmployeeCheckInType.CHECK_IN,
  EmployeeCheckInType.FEEDBACK,
  EmployeeCheckInType.PROBATION
];

function asJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function getRiskWeight(level: AgentRiskLevel) {
  const weights: Record<AgentRiskLevel, number> = {
    [AgentRiskLevel.LOW]: 0,
    [AgentRiskLevel.MEDIUM]: 1,
    [AgentRiskLevel.HIGH]: 2,
    [AgentRiskLevel.CRITICAL]: 3
  };

  return weights[level];
}

function getMaxRiskLevel(levels: AgentRiskLevel[]) {
  return levels.reduce((highest, current) => (getRiskWeight(current) > getRiskWeight(highest) ? current : highest), AgentRiskLevel.LOW);
}

function formatBucketDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hourBucket = String(Math.floor(date.getHours() / 4) * 4).padStart(2, "0");

  return `${year}${month}${day}${hourBucket}`;
}

async function resolveWatchtowerActorId(organizationId: string) {
  const memberships = await prisma.organizationMembership.findMany({
    where: {
      organizationId
    },
    select: {
      userId: true,
      role: true,
      isDefault: true
    }
  });

  if (!memberships.length) {
    throw new Error("Nao foi encontrado um usuario para atuar como fallback do Watchtower.");
  }

  const roleWeight: Record<string, number> = {
    PEOPLE_OPS: 0,
    PEOPLE_ADMIN: 1,
    ADMIN: 2,
    OWNER: 3,
    MANAGER: 4,
    RECRUITER: 5,
    HIRING_MANAGER: 6,
    EMPLOYEE: 7
  };

  const sorted = [...memberships].sort((left, right) => {
    const roleDelta = (roleWeight[left.role] ?? 99) - (roleWeight[right.role] ?? 99);

    if (roleDelta !== 0) {
      return roleDelta;
    }

    return Number(right.isDefault) - Number(left.isDefault);
  });

  return sorted[0]?.userId ?? memberships[0].userId;
}

async function createAgentStep(input: {
  agentRunId: string;
  kind: string;
  title: string;
  status: AgentStepStatus;
  output?: unknown;
  error?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
}) {
  return prisma.agentStep.create({
    data: {
      agentRunId: input.agentRunId,
      kind: input.kind,
      title: input.title,
      status: input.status,
      output: input.output === undefined ? undefined : asJsonValue(input.output),
      error: input.error ?? null,
      startedAt: input.startedAt ?? null,
      completedAt: input.completedAt ?? null
    }
  });
}

async function createBackgroundJobIfMissing<T extends BackgroundJobType>(input: {
  organizationId: string;
  type: T;
  payload: JobPayloadMap[T];
  uniqueKey: string;
}) {
  const existing = await prisma.backgroundJob.findUnique({
    where: {
      uniqueKey: input.uniqueKey
    }
  });

  if (existing) {
    return existing;
  }

  return prisma.backgroundJob.create({
    data: {
      organizationId: input.organizationId,
      type: input.type,
      payload: asJsonValue(input.payload),
      uniqueKey: input.uniqueKey
    }
  });
}

async function ensureWatchtowerTask(input: {
  organizationId: string;
  actorId: string;
  task: WatchtowerTaskInput;
}) {
  const existing = await prisma.peopleTask.findFirst({
    where: {
      organizationId: input.organizationId,
      sourceType: input.task.sourceType,
      sourceId: input.task.sourceId,
      status: {
        in: [PeopleTaskStatus.TODO, PeopleTaskStatus.IN_PROGRESS, PeopleTaskStatus.BLOCKED]
      }
    }
  });

  if (existing) {
    return {
      task: existing,
      created: false
    };
  }

  const created = await createPeopleTask({
    organizationId: input.organizationId,
    actorId: input.actorId,
    data: {
      title: input.task.title,
      description: input.task.description,
      assigneeUserId: input.task.assigneeUserId ?? undefined,
      assigneeEmployeeId: undefined,
      relatedEmployeeId: input.task.relatedEmployeeId ?? undefined,
      priority: input.task.priority,
      dueAt: input.task.dueAt ?? undefined,
      sourceType: input.task.sourceType,
      sourceId: input.task.sourceId
    }
  });

  return {
    task: created,
    created: true
  };
}

async function collectRequestSlaFindings(organizationId: string, defaultAssigneeUserId: string) {
  const requests = await prisma.hrRequest.findMany({
    where: {
      organizationId,
      status: {
        in: [HrRequestStatus.OPEN, HrRequestStatus.IN_PROGRESS, HrRequestStatus.WAITING_ON_REQUESTER]
      }
    },
    include: {
      requesterEmployee: {
        select: {
          id: true,
          fullName: true
        }
      },
      assigneeUser: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  return requests
    .map((request) => ({
      request,
      effectiveSlaStatus: getEffectiveSlaStatus({
        dueAt: request.dueAt,
        status: request.status
      })
    }))
    .filter((item) => item.effectiveSlaStatus !== SlaStatus.ON_TRACK)
    .map<WatchtowerFinding>(({ request, effectiveSlaStatus }) => {
      const isBreached = effectiveSlaStatus === SlaStatus.BREACHED;

      return {
        ruleId: "hr_request_sla",
        title: isBreached ? `SLA estourado em ${request.title}` : `SLA em risco em ${request.title}`,
        description: isBreached
          ? "A fila interna tem uma solicitacao sem resposta no tempo esperado e precisa de dono imediato."
          : "A solicitacao interna esta perto de estourar o SLA e pede priorizacao operacional.",
        severity: isBreached ? AgentRiskLevel.CRITICAL : AgentRiskLevel.HIGH,
        href: "/requests",
        taskInput: {
          title: `${isBreached ? "Tratar agora" : "Priorizar"}: ${request.title}`,
          description: `Watchtower detectou ${isBreached ? "SLA estourado" : "SLA em risco"} na solicitacao "${request.title}".`,
          assigneeUserId: request.assigneeUserId ?? defaultAssigneeUserId,
          relatedEmployeeId: request.requesterEmployeeId ?? null,
          priority: isBreached ? PeopleTaskPriority.URGENT : PeopleTaskPriority.HIGH,
          dueAt: request.dueAt ?? new Date(Date.now() + 1000 * 60 * 60 * 4),
          sourceType: "watchtower_request_sla",
          sourceId: request.id
        },
        followUpJobs: [
          {
            type: BackgroundJobType.HR_REQUEST_SLA_ALERT,
            payload: {
              requestId: request.id,
              alertLevel: isBreached ? "BREACHED" : "AT_RISK"
            },
            uniqueKey: `watchtower:request-sla:${organizationId}:${request.id}:${effectiveSlaStatus}`
          }
        ]
      };
    });
}

async function collectComplianceFindings(organizationId: string, defaultAssigneeUserId: string) {
  const requirements = await prisma.complianceRequirement.findMany({
    where: {
      organizationId,
      status: ComplianceStatus.PENDING
    },
    include: {
      employee: {
        select: {
          id: true,
          fullName: true
        }
      }
    }
  });

  return requirements
    .filter((requirement) => {
      if (!requirement.dueAt) {
        return false;
      }

      const now = Date.now();
      const dueAt = requirement.dueAt.getTime();
      return dueAt <= now || dueAt - now <= 1000 * 60 * 60 * 48;
    })
    .map<WatchtowerFinding>((requirement) => {
      const isOverdue = requirement.dueAt ? requirement.dueAt.getTime() <= Date.now() : false;

      return {
        ruleId: "compliance_pending",
        title: isOverdue ? `Compliance vencido: ${requirement.title}` : `Compliance perto do prazo: ${requirement.title}`,
        description: isOverdue
          ? "Existe item obrigatorio pendente que ja passou do prazo e precisa de acao operacional."
          : "Existe item obrigatorio prestes a vencer e o RH deve atuar antes de virar atraso.",
        severity: isOverdue ? AgentRiskLevel.HIGH : AgentRiskLevel.MEDIUM,
        href: "/people/compliance",
        taskInput: isOverdue
          ? {
              title: `Resolver pendencia de compliance: ${requirement.title}`,
              description: `Watchtower detectou pendencia vencida para ${requirement.employee?.fullName ?? "colaborador sem nome"}.`,
              assigneeUserId: defaultAssigneeUserId,
              relatedEmployeeId: requirement.employeeId,
              priority: PeopleTaskPriority.HIGH,
              dueAt: new Date(Date.now() + 1000 * 60 * 60 * 8),
              sourceType: "watchtower_compliance",
              sourceId: requirement.id
            }
          : undefined,
        followUpJobs: [
          {
            type: BackgroundJobType.COMPLIANCE_ALERT,
            payload: {
              requirementId: requirement.id,
              employeeId: requirement.employeeId,
              reason: isOverdue ? "OVERDUE" : "DUE_SOON"
            },
            uniqueKey: `watchtower:compliance:${organizationId}:${requirement.id}:${isOverdue ? "overdue" : "due-soon"}`
          }
        ]
      };
    });
}

async function collectPolicyAcknowledgementFindings(organizationId: string, defaultAssigneeUserId: string) {
  const acknowledgements = await prisma.policyAcknowledgement.findMany({
    where: {
      organizationId,
      acknowledgedAt: null
    },
    include: {
      employee: {
        select: {
          id: true,
          fullName: true
        }
      },
      document: {
        select: {
          title: true
        }
      }
    }
  });

  return acknowledgements
    .filter((acknowledgement) => {
      if (!acknowledgement.dueAt) {
        return false;
      }

      const now = Date.now();
      const dueAt = acknowledgement.dueAt.getTime();
      return dueAt <= now || dueAt - now <= 1000 * 60 * 60 * 72;
    })
    .map<WatchtowerFinding>((acknowledgement) => {
      const isOverdue = acknowledgement.dueAt ? acknowledgement.dueAt.getTime() <= Date.now() : false;
      const policyLabel = acknowledgement.document?.title ?? acknowledgement.title;

      return {
        ruleId: "policy_acknowledgement_pending",
        title: isOverdue ? `Aceite de politica vencido: ${policyLabel}` : `Aceite de politica perto do prazo: ${policyLabel}`,
        description: isOverdue
          ? "Existe um aceite de politica em atraso e o RH deve acionar follow-up imediato."
          : "Existe um aceite de politica prestes a vencer e vale lembrar o colaborador antes do atraso.",
        severity: isOverdue ? AgentRiskLevel.CRITICAL : AgentRiskLevel.MEDIUM,
        href: "/people/compliance",
        taskInput: isOverdue
          ? {
              title: `Follow-up de politica: ${acknowledgement.employee.fullName}`,
              description: `Watchtower detectou aceite em atraso para ${policyLabel}.`,
              assigneeUserId: defaultAssigneeUserId,
              relatedEmployeeId: acknowledgement.employeeId,
              priority: PeopleTaskPriority.HIGH,
              dueAt: new Date(Date.now() + 1000 * 60 * 60 * 8),
              sourceType: "watchtower_policy_ack",
              sourceId: acknowledgement.id
            }
          : undefined,
        followUpJobs: !isOverdue
          ? [
              {
                type: BackgroundJobType.PEOPLE_REMINDER,
                payload: {
                  employeeId: acknowledgement.employeeId,
                  channel: "desktop",
                  reason: "policy_ack_due_soon"
                },
                uniqueKey: `watchtower:policy-ack:${organizationId}:${acknowledgement.id}:due-soon`
              }
            ]
          : undefined
      };
    });
}

async function collectWorkflowFindings(organizationId: string, defaultAssigneeUserId: string) {
  const runs = await prisma.peopleWorkflowRun.findMany({
    where: {
      organizationId,
      status: PeopleWorkflowRunStatus.ACTIVE,
      kind: {
        in: [PeopleWorkflowKind.ONBOARDING, PeopleWorkflowKind.OFFBOARDING]
      }
    },
    include: {
      employee: {
        select: {
          id: true,
          fullName: true
        }
      },
      steps: {
        orderBy: [{ order: "asc" }]
      }
    }
  });

  return runs.flatMap<WatchtowerFinding>((run) =>
    run.steps
      .filter((step) => {
        const overdue = !!step.dueAt && step.dueAt.getTime() < Date.now() && step.status !== PeopleWorkflowStepStatus.DONE;
        const blocked = step.status === PeopleWorkflowStepStatus.BLOCKED;
        return step.isRequired && (overdue || blocked);
      })
      .map((step) => {
        const blocked = step.status === PeopleWorkflowStepStatus.BLOCKED;
        const isOffboarding = run.kind === PeopleWorkflowKind.OFFBOARDING;

        return {
          ruleId: "workflow_step_risk",
          title: blocked
            ? `${run.employee.fullName} com etapa bloqueada`
            : `${run.employee.fullName} com etapa atrasada`,
          description: `${step.title} no fluxo de ${isOffboarding ? "offboarding" : "onboarding"} precisa de acao imediata.`,
          severity: blocked || isOffboarding ? AgentRiskLevel.HIGH : AgentRiskLevel.MEDIUM,
          href: isOffboarding ? "/people/offboarding" : "/people/onboarding",
          taskInput: {
            title: `${isOffboarding ? "Destravar offboarding" : "Destravar onboarding"}: ${step.title}`,
            description: `Watchtower encontrou a etapa "${step.title}" ${blocked ? "bloqueada" : "atrasada"} para ${run.employee.fullName}.`,
            assigneeUserId: step.assigneeUserId ?? defaultAssigneeUserId,
            relatedEmployeeId: run.employeeId,
            priority: blocked || isOffboarding ? PeopleTaskPriority.HIGH : PeopleTaskPriority.MEDIUM,
            dueAt: step.dueAt ?? new Date(Date.now() + 1000 * 60 * 60 * 8),
            sourceType: "watchtower_workflow_step",
            sourceId: step.id
          }
        } satisfies WatchtowerFinding;
      })
  );
}

async function collectMissingCheckInFindings(organizationId: string, defaultAssigneeUserId: string) {
  const employees = await prisma.employee.findMany({
    where: {
      organizationId,
      status: {
        in: [EmployeeStatus.ONBOARDING, EmployeeStatus.ACTIVE]
      },
      startDate: {
        not: null
      }
    },
    include: {
      manager: {
        select: {
          id: true,
          linkedUserId: true,
          fullName: true
        }
      },
      checkIns: {
        select: {
          id: true,
          type: true,
          createdAt: true
        }
      }
    }
  });

  const maxAgeMs = 1000 * 60 * 60 * 24 * 60;
  const graceMs = 1000 * 60 * 60 * 24 * 14;

  return employees
    .filter((employee) => {
      if (!employee.startDate) {
        return false;
      }

      const startAt = employee.startDate.getTime();
      const now = Date.now();

      if (now - startAt < graceMs || now - startAt > maxAgeMs) {
        return false;
      }

      return !employee.checkIns.some((checkIn) => TRACKED_CHECKIN_TYPES.includes(checkIn.type) && checkIn.createdAt.getTime() >= startAt);
    })
    .map<WatchtowerFinding>((employee) => ({
      ruleId: "missing_initial_checkin",
      title: `Falta check-in inicial para ${employee.fullName}`,
      description: "Nao ha registro recente de acompanhamento inicial, o que aumenta risco de onboarding silenciosamente travado.",
      severity: AgentRiskLevel.MEDIUM,
      href: `/employees/${employee.id}`,
      taskInput: {
        title: `Registrar check-in inicial com ${employee.fullName}`,
        description: "Watchtower detectou ausencia de check-in no periodo inicial e abriu acompanhamento para gestor ou RH.",
        assigneeUserId: employee.manager?.linkedUserId ?? defaultAssigneeUserId,
        relatedEmployeeId: employee.id,
        priority: PeopleTaskPriority.MEDIUM,
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
        sourceType: "watchtower_missing_checkin",
        sourceId: employee.id
      }
    }));
}

async function collectBacklogFindings(organizationId: string) {
  const [openRequests, overdueTasks, atRiskRequests] = await Promise.all([
    prisma.hrRequest.count({
      where: {
        organizationId,
        status: {
          in: [HrRequestStatus.OPEN, HrRequestStatus.IN_PROGRESS, HrRequestStatus.WAITING_ON_REQUESTER]
        }
      }
    }),
    prisma.peopleTask.count({
      where: {
        organizationId,
        status: {
          in: [PeopleTaskStatus.TODO, PeopleTaskStatus.IN_PROGRESS, PeopleTaskStatus.BLOCKED]
        },
        dueAt: {
          lt: new Date()
        }
      }
    }),
    prisma.hrRequest.findMany({
      where: {
        organizationId,
        status: {
          in: [HrRequestStatus.OPEN, HrRequestStatus.IN_PROGRESS, HrRequestStatus.WAITING_ON_REQUESTER]
        }
      },
      select: {
        id: true,
        dueAt: true,
        status: true
      }
    })
  ]);

  const riskRequests = atRiskRequests.filter((request) => getEffectiveSlaStatus({ dueAt: request.dueAt, status: request.status }) !== SlaStatus.ON_TRACK);
  const findings: WatchtowerFinding[] = [];

  if (openRequests >= 10 || overdueTasks >= 6 || riskRequests.length >= 4) {
    findings.push({
      ruleId: "backlog_overload",
      title: "Backlog operacional acima do saudavel",
      description: `Watchtower encontrou ${openRequests} solicitacoes abertas, ${overdueTasks} tarefas vencidas e ${riskRequests.length} SLAs sob pressao.`,
      severity: openRequests >= 16 || overdueTasks >= 10 ? AgentRiskLevel.HIGH : AgentRiskLevel.MEDIUM,
      href: "/people/command-center"
    });
  }

  return findings;
}

async function collectWatchtowerFindings(organizationId: string, actorId: string) {
  const findings: WatchtowerFinding[] = [];
  const requestFindings = await collectRequestSlaFindings(organizationId, actorId);
  const complianceFindings = await collectComplianceFindings(organizationId, actorId);
  const policyAcknowledgementFindings = await collectPolicyAcknowledgementFindings(organizationId, actorId);
  const workflowFindings = await collectWorkflowFindings(organizationId, actorId);
  const checkInFindings = await collectMissingCheckInFindings(organizationId, actorId);
  const backlogFindings = await collectBacklogFindings(organizationId);

  findings.push(...requestFindings, ...complianceFindings, ...policyAcknowledgementFindings, ...workflowFindings, ...checkInFindings, ...backlogFindings);

  return findings.slice(0, WATCHTOWER_SWEEP_LIMIT);
}

export async function scheduleWatchtowerSweepJobs(input?: { organizationId?: string }) {
  const organizations = await prisma.organization.findMany({
    where: input?.organizationId
      ? {
          id: input.organizationId
        }
      : undefined,
    select: {
      id: true
    }
  });

  const bucketKey = formatBucketDate(new Date());
  const scheduled: string[] = [];

  for (const organization of organizations) {
    const job = await createBackgroundJobIfMissing({
      organizationId: organization.id,
      type: BackgroundJobType.WATCHTOWER_SWEEP,
      payload: {
        scope: "people_ops",
        triggeredBy: "cron",
        bucketKey
      },
      uniqueKey: `watchtower:sweep:${organization.id}:${bucketKey}`
    });

    scheduled.push(job.id);
  }

  return {
    bucketKey,
    scheduled
  };
}

export async function processWatchtowerSweepJob(
  job: BackgroundJob,
  payload: JobPayloadMap["WATCHTOWER_SWEEP"]
): Promise<BackgroundJobProcessorResult> {
  const actorId = await resolveWatchtowerActorId(job.organizationId);
  const agentRun = await prisma.agentRun.create({
    data: {
      organizationId: job.organizationId,
      startedByUserId: actorId,
      mode: AgentRunMode.WATCHTOWER,
      goal: "Monitorar riscos operacionais de people ops e abrir acoes proativas.",
      actionType: "watchtower_sweep",
      actionPayload: asJsonValue(payload),
      status: AgentRunStatus.EXECUTING,
      riskLevel: AgentRiskLevel.LOW,
      requiresApproval: false,
      summary: "Watchtower em execucao."
    }
  });

  const detectStep = await createAgentStep({
    agentRunId: agentRun.id,
    kind: "detect",
    title: "Detectar riscos operacionais",
    status: AgentStepStatus.IN_PROGRESS,
    startedAt: new Date()
  });

  let actionStepId: string | null = null;

  try {
    const findings = await collectWatchtowerFindings(job.organizationId, actorId);

    await prisma.agentStep.update({
      where: {
        id: detectStep.id
      },
      data: {
        status: AgentStepStatus.COMPLETED,
        output: asJsonValue({
          findings: findings.map((finding) => ({
            ruleId: finding.ruleId,
            title: finding.title,
            severity: finding.severity,
            href: finding.href
          }))
        }),
        completedAt: new Date()
      }
    });

    const actionStep = await createAgentStep({
      agentRunId: agentRun.id,
      kind: "act",
      title: "Abrir acoes proativas",
      status: AgentStepStatus.IN_PROGRESS,
      startedAt: new Date()
    });
    actionStepId = actionStep.id;

    const createdTasks: string[] = [];
    const queuedJobs: string[] = [];

    for (const finding of findings) {
      if (finding.taskInput) {
        const taskResult = await ensureWatchtowerTask({
          organizationId: job.organizationId,
          actorId,
          task: finding.taskInput
        });

        if (taskResult.created) {
          createdTasks.push(taskResult.task.id);
        }

        if (taskResult.task.id) {
          const reminder = await createBackgroundJobIfMissing({
            organizationId: job.organizationId,
            type: BackgroundJobType.PEOPLE_REMINDER,
            payload: {
              employeeId: finding.taskInput.relatedEmployeeId ?? undefined,
              taskId: taskResult.task.id,
              channel: finding.severity === AgentRiskLevel.CRITICAL ? "email" : "desktop",
              reason: finding.ruleId
            },
            uniqueKey: `watchtower:people-reminder:${job.organizationId}:${taskResult.task.id}:${finding.ruleId}`
          });

          queuedJobs.push(reminder.id);
        }
      }

      for (const followUpJob of finding.followUpJobs ?? []) {
        const backgroundJob = await createBackgroundJobIfMissing({
          organizationId: job.organizationId,
          type: followUpJob.type,
          payload: followUpJob.payload,
          uniqueKey: followUpJob.uniqueKey
        });

        queuedJobs.push(backgroundJob.id);
      }
    }

    await prisma.agentStep.update({
      where: {
        id: actionStep.id
      },
      data: {
        status: AgentStepStatus.COMPLETED,
        output: asJsonValue({
          createdTaskIds: createdTasks,
          queuedJobIds: queuedJobs
        }),
        completedAt: new Date()
      }
    });

    const highestRisk = getMaxRiskLevel(findings.map((finding) => finding.severity));

    if (findings.length) {
      const summaryJob = await createBackgroundJobIfMissing({
        organizationId: job.organizationId,
        type: BackgroundJobType.INTERNAL_SUMMARY_BUILD,
        payload: {
          scope: "people_ops",
          deliveryTarget: "email"
        },
        uniqueKey: `watchtower:summary:${job.organizationId}:${payload.bucketKey ?? formatBucketDate(new Date())}`
      });

      queuedJobs.push(summaryJob.id);
    }

    const summary = findings.length
      ? `Watchtower detectou ${findings.length} risco(s), abriu ${createdTasks.length} tarefa(s) e enfileirou ${queuedJobs.length} alerta(s).`
      : "Watchtower nao encontrou riscos operacionais acionaveis nesta varredura.";

    await prisma.agentRun.update({
      where: {
        id: agentRun.id
      },
      data: {
        status: AgentRunStatus.SUCCEEDED,
        riskLevel: highestRisk,
        summary,
        completedAt: new Date(),
        error: null
      }
    });

    await createAgentStep({
      agentRunId: agentRun.id,
      kind: "summarize",
      title: "Resumir a varredura",
      status: AgentStepStatus.COMPLETED,
      output: {
        summary,
        findingCount: findings.length,
        highestRisk,
        createdTaskCount: createdTasks.length,
        queuedJobCount: queuedJobs.length
      },
      completedAt: new Date()
    });

    await createAuditEvent({
      organizationId: job.organizationId,
      actorId,
      action: "watchtower.sweep_completed",
      entityType: "agent_run",
      entityId: agentRun.id,
      summary,
      metadata: {
        findingCount: findings.length,
        createdTaskCount: createdTasks.length,
        queuedJobCount: queuedJobs.length,
        bucketKey: payload.bucketKey ?? null
      }
    });

    return {
      status: BackgroundJobStatus.SUCCEEDED,
      summary
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao executar o sweep do Watchtower.";

    await prisma.agentStep.update({
      where: {
        id: actionStepId ?? detectStep.id
      },
      data: {
        status: AgentStepStatus.FAILED,
        error: message,
        completedAt: new Date()
      }
    });

    await prisma.agentRun.update({
      where: {
        id: agentRun.id
      },
      data: {
        status: AgentRunStatus.FAILED,
        error: message,
        summary: "Watchtower falhou ao concluir a varredura.",
        completedAt: new Date()
      }
    });

    return {
      status: BackgroundJobStatus.FAILED,
      error: message
    };
  }
}

export async function processPeopleReminderJob(
  job: BackgroundJob,
  payload: JobPayloadMap["PEOPLE_REMINDER"]
): Promise<BackgroundJobProcessorResult> {
  if (payload.channel === "email") {
    const task = payload.taskId
      ? await prisma.peopleTask.findFirst({
          where: {
            id: payload.taskId,
            organizationId: job.organizationId
          },
          include: {
            assigneeUser: {
              select: {
                email: true,
                name: true
              }
            },
            relatedEmployee: {
              select: {
                fullName: true
              }
            }
          }
        })
      : null;

    const employee = !task && payload.employeeId
      ? await prisma.employee.findFirst({
          where: {
            id: payload.employeeId,
            organizationId: job.organizationId
          },
          select: {
            id: true,
            fullName: true,
            workEmail: true,
            personalEmail: true
          }
        })
      : null;

    const recipients = task?.assigneeUser?.email
      ? [task.assigneeUser.email]
      : employee
        ? [employee.workEmail, employee.personalEmail].filter((value): value is string => !!value)
        : [];
    const reasonLabel =
      payload.reason === "policy_assignment"
        ? "Uma nova politica interna foi atribuida para aceite."
        : payload.reason === "policy_ack_due_soon"
          ? "Seu aceite de politica esta se aproximando do prazo."
          : `Motivo: ${payload.reason ?? "general"}.`;
    const subject = task
      ? `Watchtower: tarefa requer atencao - ${task.title}`
      : payload.reason === "policy_assignment"
        ? "HireFlow: nova politica aguardando seu aceite"
        : payload.reason === "policy_ack_due_soon"
          ? "HireFlow: lembrete de aceite de politica"
          : "HireFlow: lembrete operacional";
    const html = task
      ? `<p>O Watchtower identificou uma acao que requer atencao imediata.</p><p><strong>${task.title}</strong></p><p>${task.relatedEmployee?.fullName ? `Colaborador relacionado: ${task.relatedEmployee.fullName}.` : ""}</p><p>${reasonLabel}</p>`
      : `<p>O HireFlow registrou uma pendencia operacional ligada a voce.</p><p><strong>${employee?.fullName ?? "Colaborador"}</strong></p><p>${reasonLabel}</p><p>Abra o portal interno para revisar suas politicas e pendencias.</p>`;
    const text = task
      ? `O Watchtower identificou uma acao que requer atencao imediata.\n\n${task.title}\n${task.relatedEmployee?.fullName ? `Colaborador relacionado: ${task.relatedEmployee.fullName}\n` : ""}${reasonLabel}`
      : `O HireFlow registrou uma pendencia operacional ligada a voce.\n\n${employee?.fullName ?? "Colaborador"}\n${reasonLabel}\nAbra o portal interno para revisar suas politicas e pendencias.`;

    await sendOperationalEmail({
      organizationId: job.organizationId,
      recipients,
      subject,
      html,
      text,
      action: "watchtower.people_reminder_email_sent",
      entityType: payload.taskId ? "people_task" : "employee",
      entityId: payload.taskId ?? payload.employeeId ?? null,
      metadata: {
        reason: payload.reason ?? null
      }
    });
  }

  await createAuditEvent({
    organizationId: job.organizationId,
    action: "watchtower.people_reminder_emitted",
    entityType: payload.taskId ? "people_task" : payload.requestId ? "hr_request" : "employee",
    entityId: payload.taskId ?? payload.requestId ?? payload.employeeId ?? null,
    summary: `Lembrete operacional emitido via Watchtower (${payload.reason ?? "general"}).`,
    metadata: {
      channel: payload.channel ?? "desktop"
    }
  });

  return {
    status: BackgroundJobStatus.SUCCEEDED,
    summary: "Operational reminder emitted for the people ops queues."
  };
}

export async function processHrRequestSlaAlertJob(
  job: BackgroundJob,
  payload: JobPayloadMap["HR_REQUEST_SLA_ALERT"]
): Promise<BackgroundJobProcessorResult> {
  const request = await prisma.hrRequest.findFirst({
    where: {
      id: payload.requestId,
      organizationId: job.organizationId
    }
  });

  if (!request) {
    return {
      status: BackgroundJobStatus.FAILED,
      error: "HR request not found for SLA alert."
    };
  }

  await createAuditEvent({
    organizationId: job.organizationId,
    action: "watchtower.hr_request_sla_alert",
    entityType: "hr_request",
    entityId: request.id,
    summary: `Watchtower marcou ${request.title} com SLA ${payload.alertLevel.toLowerCase()}.`,
    metadata: {
      alertLevel: payload.alertLevel
    }
  });

  if (payload.alertLevel === "BREACHED") {
    const recipients = request.assigneeUserId
      ? (
          await prisma.user.findMany({
            where: {
              id: request.assigneeUserId
            },
            select: {
              email: true
            }
          })
        )
          .map((user) => user.email)
          .filter(Boolean)
      : [];

    await sendOperationalEmail({
      organizationId: job.organizationId,
      recipients,
      subject: `Watchtower: SLA estourado - ${request.title}`,
      html: `<p>Uma solicitacao interna estourou o SLA.</p><p><strong>${request.title}</strong></p><p>Acao recomendada: priorizar atendimento imediato no service desk.</p>`,
      text: `Uma solicitacao interna estourou o SLA.\n\n${request.title}\n\nAcao recomendada: priorizar atendimento imediato no service desk.`,
      action: "watchtower.hr_request_sla_email_sent",
      entityType: "hr_request",
      entityId: request.id,
      metadata: {
        alertLevel: payload.alertLevel
      }
    });
  }

  return {
    status: BackgroundJobStatus.SUCCEEDED,
    summary: `SLA alert recorded for ${request.title}.`
  };
}

export async function processComplianceAlertJob(
  job: BackgroundJob,
  payload: JobPayloadMap["COMPLIANCE_ALERT"]
): Promise<BackgroundJobProcessorResult> {
  const requirement = await prisma.complianceRequirement.findFirst({
    where: {
      id: payload.requirementId,
      organizationId: job.organizationId
    },
    include: {
      employee: {
        select: {
          fullName: true
        }
      }
    }
  });

  if (!requirement) {
    return {
      status: BackgroundJobStatus.FAILED,
      error: "Compliance requirement not found for alert."
    };
  }

  await createAuditEvent({
    organizationId: job.organizationId,
    action: "watchtower.compliance_alert",
    entityType: "compliance_requirement",
    entityId: requirement.id,
    summary: `Watchtower destacou ${requirement.title} para ${requirement.employee?.fullName ?? "colaborador"}.`,
    metadata: {
      reason: payload.reason ?? null
    }
  });

  if (payload.reason === "OVERDUE") {
    await sendOperationalEmail({
      organizationId: job.organizationId,
      subject: `Watchtower: compliance vencido - ${requirement.title}`,
      html: `<p>Existe um item de compliance vencido na operacao.</p><p><strong>${requirement.title}</strong></p><p>${requirement.employee?.fullName ? `Colaborador: ${requirement.employee.fullName}.` : ""}</p><p>Acao recomendada: regularizar a pendencia hoje.</p>`,
      text: `Existe um item de compliance vencido na operacao.\n\n${requirement.title}\n${requirement.employee?.fullName ? `Colaborador: ${requirement.employee.fullName}\n` : ""}Acao recomendada: regularizar a pendencia hoje.`,
      action: "watchtower.compliance_email_sent",
      entityType: "compliance_requirement",
      entityId: requirement.id,
      metadata: {
        reason: payload.reason
      }
    });
  }

  return {
    status: BackgroundJobStatus.SUCCEEDED,
    summary: `Compliance alert recorded for ${requirement.title}.`
  };
}

export async function processInternalSummaryBuildJob(
  job: BackgroundJob,
  payload: JobPayloadMap["INTERNAL_SUMMARY_BUILD"]
): Promise<BackgroundJobProcessorResult> {
  const [openRequests, pendingCompliance, activeOnboarding, latestRun, recentTasks] = await Promise.all([
    prisma.hrRequest.count({
      where: {
        organizationId: job.organizationId,
        status: {
          in: [HrRequestStatus.OPEN, HrRequestStatus.IN_PROGRESS, HrRequestStatus.WAITING_ON_REQUESTER]
        }
      }
    }),
    prisma.complianceRequirement.count({
      where: {
        organizationId: job.organizationId,
        status: ComplianceStatus.PENDING
      }
    }),
    prisma.peopleWorkflowRun.count({
      where: {
        organizationId: job.organizationId,
        kind: PeopleWorkflowKind.ONBOARDING,
        status: PeopleWorkflowRunStatus.ACTIVE
      }
    }),
    prisma.agentRun.findFirst({
      where: {
        organizationId: job.organizationId,
        mode: AgentRunMode.WATCHTOWER,
        status: AgentRunStatus.SUCCEEDED
      },
      orderBy: [{ createdAt: "desc" }]
    }),
    prisma.peopleTask.findMany({
      where: {
        organizationId: job.organizationId,
        sourceType: {
          startsWith: "watchtower_"
        }
      },
      orderBy: [{ createdAt: "desc" }],
      take: 5,
      select: {
        title: true,
        status: true
      }
    })
  ]);

  const summary = `Resumo interno ${payload.scope ?? "company"}: ${openRequests} solicitacoes abertas, ${pendingCompliance} itens de compliance pendentes e ${activeOnboarding} onboardings ativos.`;

  await createAuditEvent({
    organizationId: job.organizationId,
    action: "watchtower.internal_summary_built",
    entityType: "organization",
    summary,
    metadata: {
      scope: payload.scope ?? "company",
      deliveryTarget: payload.deliveryTarget ?? null
    }
  });

  if (payload.deliveryTarget === "email") {
    const taskListHtml = recentTasks.length ? `<ul>${recentTasks.map((task) => `<li>${task.title} (${task.status})</li>`).join("")}</ul>` : "<p>Nenhuma tarefa nova criada pelo Watchtower.</p>";
    const taskListText = recentTasks.length ? recentTasks.map((task) => `- ${task.title} (${task.status})`).join("\n") : "Nenhuma tarefa nova criada pelo Watchtower.";

    await sendOperationalEmail({
      organizationId: job.organizationId,
      subject: "Watchtower digest: riscos operacionais de people ops",
      html: `<p>${summary}</p><p><strong>Ultima leitura:</strong> ${latestRun?.summary ?? "Sem run recente."}</p>${taskListHtml}`,
      text: `${summary}\n\nUltima leitura: ${latestRun?.summary ?? "Sem run recente."}\n\n${taskListText}`,
      action: "watchtower.summary_email_sent",
      entityType: "organization",
      metadata: {
        scope: payload.scope ?? "company"
      }
    });
  }

  return {
    status: BackgroundJobStatus.SUCCEEDED,
    summary
  };
}
