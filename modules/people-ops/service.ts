import {
  ComplianceRequirementType,
  ComplianceStatus,
  EmployeeStatus,
  PeopleEventType,
  PeopleTaskPriority,
  PeopleTaskStatus,
  PeopleWorkflowKind,
  PeopleWorkflowRunStatus,
  PeopleWorkflowStepStatus
} from "@prisma/client";

import { createAuditEvent } from "@/lib/audit/events";
import { prisma } from "@/lib/prisma/client";

type DefaultTemplateSeed = {
  name: string;
  kind: PeopleWorkflowKind;
  steps: Array<{
    title: string;
    description: string;
    ownerLabel: string;
    dueInDays: number;
    category?: string;
  }>;
};

const DEFAULT_TEMPLATES: DefaultTemplateSeed[] = [
  {
    name: "Onboarding padrao",
    kind: PeopleWorkflowKind.ONBOARDING,
    steps: [
      {
        title: "Enviar comunicação de boas-vindas",
        description: "Confirme data de inicio, contatos principais e fluxo inicial com o colaborador.",
        ownerLabel: "People Ops",
        dueInDays: 0,
        category: "communication"
      },
      {
        title: "Preparar acessos, equipamentos e conta corporativa",
        description: "Garanta que o colaborador tenha o setup minimo para operar no primeiro dia.",
        ownerLabel: "TI",
        dueInDays: 1,
        category: "provisioning"
      },
      {
        title: "Coletar documentos obrigatorios e políticas",
        description: "Rastreie documentos pendentes e aceite das principais políticas internas.",
        ownerLabel: "Collaborator",
        dueInDays: 2,
        category: "documentation"
      },
      {
        title: "Agendar kickoff com gestor",
        description: "Marque a primeira conversa operacional para alinhamento de contexto e expectativas.",
        ownerLabel: "Manager",
        dueInDays: 3,
        category: "meeting"
      },
      {
        title: "Rodar check-in de 30 dias",
        description: "Registrar adaptacao inicial, riscos e follow-ups do período inicial.",
        ownerLabel: "Manager",
        dueInDays: 30,
        category: "probation"
      }
    ]
  },
  {
    name: "Offboarding padrao",
    kind: PeopleWorkflowKind.OFFBOARDING,
    steps: [
      {
        title: "Confirmar documentação e comunicação de desligamento",
        description: "Organize a documentação obrigatória e os responsáveis pela execução do processo.",
        ownerLabel: "People Ops",
        dueInDays: 0,
        category: "documentation"
      },
      {
        title: "Encerrar acessos e recolher ativos",
        description: "Rastreie encerramento de contas, sistemas e devolucao de equipamentos.",
        ownerLabel: "TI",
        dueInDays: 1,
        category: "access"
      },
      {
        title: "Executar handoff com gestor",
        description: "Garantir transicao de contexto, clientes, backlog e responsabilidades.",
        ownerLabel: "Manager",
        dueInDays: 2,
        category: "handover"
      },
      {
        title: "Realizar entrevista de saída",
        description: "Registrar aprendizados, pontos de atenção e sinais operacionais relevantes.",
        ownerLabel: "People Ops",
        dueInDays: 3,
        category: "exit_interview"
      }
    ]
  }
];

function addDays(baseDate: Date, days: number) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

function getStepAssignee(input: {
  ownerLabel: string;
  createdById: string;
  employeeId: string;
}) {
  if (input.ownerLabel === "Collaborator") {
    return {
      assigneeEmployeeId: input.employeeId,
      assigneeUserId: null as string | null
    };
  }

  if (input.ownerLabel === "People Ops") {
    return {
      assigneeEmployeeId: null,
      assigneeUserId: input.createdById
    };
  }

  return {
    assigneeEmployeeId: null,
    assigneeUserId: null
  };
}

export async function ensureDefaultWorkflowTemplates(organizationId: string) {
  const existing = await prisma.peopleWorkflowTemplate.findMany({
    where: {
      organizationId,
      isDefault: true
    }
  });

  const existingKinds = new Set(existing.map((template) => template.kind));

  for (const template of DEFAULT_TEMPLATES) {
    if (existingKinds.has(template.kind)) {
      continue;
    }

    await prisma.peopleWorkflowTemplate.create({
      data: {
        organizationId,
        kind: template.kind,
        name: template.name,
        isDefault: true,
        steps: {
          create: template.steps.map((step, index) => ({
            ...step,
            order: index
          }))
        }
      }
    });
  }
}

export async function createWorkflowRunFromTemplate(input: {
  organizationId: string;
  employeeId: string;
  createdById: string;
  kind: PeopleWorkflowKind;
  templateId?: string;
}) {
  await ensureDefaultWorkflowTemplates(input.organizationId);

  const employee = await prisma.employee.findFirst({
    where: {
      id: input.employeeId,
      organizationId: input.organizationId
    }
  });

  if (!employee) {
    throw new Error("Colaborador não encontrado.");
  }

  const existingRun = await prisma.peopleWorkflowRun.findFirst({
    where: {
      organizationId: input.organizationId,
      employeeId: employee.id,
      kind: input.kind,
      status: PeopleWorkflowRunStatus.ACTIVE
    },
    include: {
      steps: {
        orderBy: [{ order: "asc" }]
      }
    }
  });

  if (existingRun) {
    return existingRun;
  }

  const template =
    (input.templateId
      ? await prisma.peopleWorkflowTemplate.findFirst({
          where: {
            id: input.templateId,
            organizationId: input.organizationId
          },
          include: {
            steps: {
              orderBy: [{ order: "asc" }]
            }
          }
        })
      : null) ??
    (await prisma.peopleWorkflowTemplate.findFirst({
      where: {
        organizationId: input.organizationId,
        kind: input.kind,
        isDefault: true
      },
      include: {
        steps: {
          orderBy: [{ order: "asc" }]
        }
      }
    }));

  if (!template) {
    throw new Error("Template operacional não encontrado.");
  }

  const anchorDate = employee.startDate ?? new Date();
  const dueAt = template.steps.length ? addDays(anchorDate, Math.max(...template.steps.map((step) => step.dueInDays))) : anchorDate;

  const run = await prisma.peopleWorkflowRun.create({
    data: {
      organizationId: input.organizationId,
      employeeId: employee.id,
      templateId: template.id,
      createdById: input.createdById,
      kind: input.kind,
      title: `${input.kind === PeopleWorkflowKind.ONBOARDING ? "Onboarding" : "Offboarding"} - ${employee.fullName}`,
      dueAt,
      steps: {
        create: template.steps.map((step) => ({
          organizationId: input.organizationId,
          title: step.title,
          description: step.description,
          ownerLabel: step.ownerLabel,
          category: step.category,
          isRequired: step.isRequired,
          order: step.order,
          dueAt: addDays(anchorDate, step.dueInDays),
          ...getStepAssignee({
            ownerLabel: step.ownerLabel,
            createdById: input.createdById,
            employeeId: employee.id
          })
        }))
      }
    },
    include: {
      steps: {
        orderBy: [{ order: "asc" }]
      }
    }
  });

  await prisma.employee.update({
    where: {
      id: employee.id
    },
    data: {
      status: input.kind === PeopleWorkflowKind.ONBOARDING ? EmployeeStatus.ONBOARDING : EmployeeStatus.OFFBOARDING
    }
  });

  await prisma.peopleTask.createMany({
    data: run.steps.map((step) => ({
      organizationId: input.organizationId,
      title: step.title,
      description: step.description,
      assigneeUserId: step.assigneeUserId,
      assigneeEmployeeId: step.assigneeEmployeeId,
      relatedEmployeeId: employee.id,
      createdById: input.createdById,
      sourceType: "workflow_step",
      sourceId: step.id,
      priority:
        step.category === "documentation" || step.category === "access"
          ? PeopleTaskPriority.HIGH
          : PeopleTaskPriority.MEDIUM,
      status: PeopleTaskStatus.TODO,
      dueAt: step.dueAt
    }))
  });

  const compliancePayload = run.steps
    .filter((step) => step.category === "documentation")
    .map((step) => ({
      organizationId: input.organizationId,
      employeeId: employee.id,
      title: step.title,
      description: step.description,
      type: ComplianceRequirementType.DOCUMENT,
      status: ComplianceStatus.PENDING,
      dueAt: step.dueAt,
      sourceType: "workflow_step",
      sourceId: step.id
    }));

  if (compliancePayload.length) {
    await prisma.complianceRequirement.createMany({
      data: compliancePayload
    });
  }

  const eventPayload = run.steps
    .filter((step) => ["meeting", "probation", "exit_interview"].includes(step.category ?? ""))
    .map((step) => ({
      organizationId: input.organizationId,
      title: step.title,
      description: step.description,
      type:
        step.category === "probation"
          ? PeopleEventType.PROBATION_REVIEW
          : step.category === "exit_interview"
            ? PeopleEventType.EXIT_INTERVIEW
            : PeopleEventType.CHECK_IN,
      startsAt: step.dueAt ?? anchorDate,
      relatedEmployeeId: employee.id,
      workflowRunId: run.id,
      createdById: input.createdById
    }));

  if (eventPayload.length) {
    await prisma.peopleEvent.createMany({
      data: eventPayload
    });
  }

  await createAuditEvent({
    organizationId: input.organizationId,
    actorId: input.createdById,
    action: "people_workflow.created",
    entityType: "employee",
    entityId: employee.id,
    summary: `${input.kind === PeopleWorkflowKind.ONBOARDING ? "Onboarding" : "Offboarding"} criado para ${employee.fullName}.`,
    metadata: {
      workflowRunId: run.id,
      kind: run.kind,
      stepCount: run.steps.length
    }
  });

  return run;
}

export async function updateWorkflowStepStatus(input: {
  organizationId: string;
  actorId: string;
  stepId: string;
  status: PeopleWorkflowStepStatus;
}) {
  const step = await prisma.peopleWorkflowStep.findFirst({
    where: {
      id: input.stepId,
      organizationId: input.organizationId
    },
    include: {
      run: {
        include: {
          employee: true,
          steps: true
        }
      }
    }
  });

  if (!step) {
    throw new Error("Etapa operacional não encontrada.");
  }

  const updatedStep = await prisma.peopleWorkflowStep.update({
    where: {
      id: step.id
    },
    data: {
      status: input.status,
      completedAt: input.status === PeopleWorkflowStepStatus.DONE ? new Date() : null
    }
  });

  const mappedTaskStatus =
    input.status === PeopleWorkflowStepStatus.DONE
      ? PeopleTaskStatus.DONE
      : input.status === PeopleWorkflowStepStatus.BLOCKED
        ? PeopleTaskStatus.BLOCKED
        : input.status === PeopleWorkflowStepStatus.IN_PROGRESS
          ? PeopleTaskStatus.IN_PROGRESS
          : PeopleTaskStatus.TODO;

  await prisma.peopleTask.updateMany({
    where: {
      organizationId: input.organizationId,
      sourceType: "workflow_step",
      sourceId: step.id
    },
    data: {
      status: mappedTaskStatus,
      completedAt: input.status === PeopleWorkflowStepStatus.DONE ? new Date() : null
    }
  });

  await prisma.complianceRequirement.updateMany({
    where: {
      organizationId: input.organizationId,
      sourceType: "workflow_step",
      sourceId: step.id
    },
    data: {
      status: input.status === PeopleWorkflowStepStatus.DONE ? ComplianceStatus.COMPLETED : ComplianceStatus.PENDING,
      completedAt: input.status === PeopleWorkflowStepStatus.DONE ? new Date() : null
    }
  });

  const refreshRun = await prisma.peopleWorkflowRun.findUniqueOrThrow({
    where: {
      id: step.runId
    },
    include: {
      steps: true
    }
  });

  const pendingRequiredSteps = refreshRun.steps.filter((item) => item.isRequired && item.status !== PeopleWorkflowStepStatus.DONE);

  if (!pendingRequiredSteps.length) {
    await prisma.peopleWorkflowRun.update({
      where: {
        id: refreshRun.id
      },
      data: {
        status: PeopleWorkflowRunStatus.COMPLETED,
        completedAt: new Date()
      }
    });

    await prisma.employee.update({
      where: {
        id: step.run.employee.id
      },
      data: {
        status: refreshRun.kind === PeopleWorkflowKind.ONBOARDING ? EmployeeStatus.ACTIVE : EmployeeStatus.INACTIVE
      }
    });
  }

  await createAuditEvent({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: "people_workflow.step_updated",
    entityType: "people_workflow_step",
    entityId: updatedStep.id,
    summary: `Etapa ${updatedStep.title} atualizada para ${updatedStep.status}.`,
    metadata: {
      workflowRunId: step.run.id,
      kind: step.run.kind
    }
  });

  return updatedStep;
}
