import {
  AgentRiskLevel,
  HrRequestCategory,
  HrRequestStatus,
  PeopleTaskPriority,
  PeopleTaskStatus,
  PeopleWorkflowKind,
  type Prisma
} from "@prisma/client";

import type { AppPermission } from "@/lib/auth/permission-matrix";
import { prisma } from "@/lib/prisma/client";
import { createHrRequest, updateHrRequestStatus } from "@/modules/hr-requests/service";
import { createPeopleTask, updatePeopleTaskStatus } from "@/modules/people-tasks/service";
import { createWorkflowRunFromTemplate } from "@/modules/people-ops/service";
import type { CompanyChatActionProposal, CompanyChatActionType } from "@/types/company-chat";

export type AgentActionPreviewInput = {
  organizationId: string;
  userId: string;
  payload: Record<string, unknown>;
};

export type AgentActionExecuteInput = AgentActionPreviewInput;

export type AgentActionExecuteResult = {
  summary: string;
  targetType?: string | null;
  targetId?: string | null;
  resultPayload?: Prisma.InputJsonValue | null;
};

export type AgentActionDefinition = {
  type: CompanyChatActionType;
  label: string;
  riskLevel: AgentRiskLevel;
  requiresApproval: boolean;
  requiredPermission?: AppPermission;
  buildPreview: (input: AgentActionPreviewInput) => Promise<string>;
  execute: (input: AgentActionExecuteInput) => Promise<AgentActionExecuteResult>;
};

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asDate(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function asJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

async function getApplicationContext(organizationId: string, applicationId: string) {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      organizationId
    },
    include: {
      candidate: true,
      job: true,
      currentStage: true
    }
  });

  if (!application) {
    throw new Error("Aplicacao nao encontrada no workspace atual.");
  }

  return application;
}

async function getEmployeeContext(organizationId: string, employeeId: string) {
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      organizationId
    }
  });

  if (!employee) {
    throw new Error("Colaborador nao encontrado no workspace atual.");
  }

  return employee;
}

async function getHrRequestContext(organizationId: string, requestId: string) {
  const request = await prisma.hrRequest.findFirst({
    where: {
      id: requestId,
      organizationId
    }
  });

  if (!request) {
    throw new Error("Solicitacao interna nao encontrada no workspace atual.");
  }

  return request;
}

async function getPeopleTaskContext(organizationId: string, taskId: string) {
  const task = await prisma.peopleTask.findFirst({
    where: {
      id: taskId,
      organizationId
    }
  });

  if (!task) {
    throw new Error("People task nao encontrada no workspace atual.");
  }

  return task;
}

const actionRegistry: Record<CompanyChatActionType, AgentActionDefinition> = {
  create_note: {
    type: "create_note",
    label: "Criar nota",
    riskLevel: AgentRiskLevel.LOW,
    requiresApproval: false,
    requiredPermission: "create_hiring_notes",
    async buildPreview(input) {
      const candidateId = asString(input.payload.candidateId);
      const applicationId = asString(input.payload.applicationId);
      const content = asString(input.payload.content);

      if (!content || (!candidateId && !applicationId)) {
        throw new Error("A nota precisa de conteudo e de um candidato ou aplicacao.");
      }

      if (applicationId) {
        const application = await getApplicationContext(input.organizationId, applicationId);
        return `Criar uma nota interna para ${application.candidate.fullName} na vaga ${application.job.title}.`;
      }

      const candidate = await prisma.candidate.findFirst({
        where: {
          id: candidateId!,
          organizationId: input.organizationId
        }
      });

      if (!candidate) {
        throw new Error("Candidato nao encontrado no workspace atual.");
      }

      return `Criar uma nota interna para ${candidate.fullName}.`;
    },
    async execute(input) {
      const candidateId = asString(input.payload.candidateId);
      const applicationId = asString(input.payload.applicationId);
      const content = asString(input.payload.content);

      if (!content || (!candidateId && !applicationId)) {
        throw new Error("Chat action is missing note context.");
      }

      const note = await prisma.hiringNote.create({
        data: {
          organizationId: input.organizationId,
          authorId: input.userId,
          candidateId,
          applicationId,
          content
        }
      });

      return {
        summary: "Nota criada a partir do agente corporativo.",
        targetType: "hiring_note",
        targetId: note.id,
        resultPayload: asJsonValue({
          noteId: note.id,
          candidateId,
          applicationId
        })
      };
    }
  },
  move_stage: {
    type: "move_stage",
    label: "Mover etapa",
    riskLevel: AgentRiskLevel.HIGH,
    requiresApproval: true,
    requiredPermission: "manage_applications",
    async buildPreview(input) {
      const applicationId = asString(input.payload.applicationId);
      const stageId = asString(input.payload.stageId);

      if (!applicationId || !stageId) {
        throw new Error("A movimentacao de etapa precisa de aplicacao e etapa de destino.");
      }

      const [application, stage] = await Promise.all([
        getApplicationContext(input.organizationId, applicationId),
        prisma.pipelineStage.findFirst({
          where: {
            id: stageId,
            organizationId: input.organizationId
          }
        })
      ]);

      if (!stage) {
        throw new Error("Etapa de destino nao encontrada no workspace atual.");
      }

      return `Mover ${application.candidate.fullName} da vaga ${application.job.title} para ${stage.name}.`;
    },
    async execute(input) {
      const applicationId = asString(input.payload.applicationId);
      const stageId = asString(input.payload.stageId);

      if (!applicationId || !stageId) {
        throw new Error("Chat action is missing stage transition context.");
      }

      const application = await prisma.application.findFirst({
        where: {
          id: applicationId,
          organizationId: input.organizationId
        },
        include: {
          candidate: true,
          job: true
        }
      });

      if (!application) {
        throw new Error("Application not found for stage transition.");
      }

      const stage = await prisma.pipelineStage.findFirst({
        where: {
          id: stageId,
          organizationId: input.organizationId
        }
      });

      if (!stage) {
        throw new Error("Stage not found for stage transition.");
      }

      await prisma.application.update({
        where: {
          id: application.id
        },
        data: {
          currentStageId: stageId,
          history: {
            create: {
              fromStageId: application.currentStageId,
              toStageId: stageId,
              movedById: input.userId,
              notes: "Movimentacao confirmada via agente corporativo."
            }
          }
        }
      });

      return {
        summary: `Etapa atualizada para ${stage.name} via agente corporativo.`,
        targetType: "application",
        targetId: application.id,
        resultPayload: asJsonValue({
          applicationId: application.id,
          stageId: stage.id
        })
      };
    }
  },
  save_shortlist: {
    type: "save_shortlist",
    label: "Salvar shortlist",
    riskLevel: AgentRiskLevel.LOW,
    requiresApproval: false,
    requiredPermission: "save_views",
    async buildPreview(input) {
      const jobId = asString(input.payload.jobId);
      const name = asString(input.payload.name) ?? "Shortlist";
      const applicationIds = Array.isArray(input.payload.applicationIds)
        ? input.payload.applicationIds.filter((value): value is string => typeof value === "string")
        : [];

      if (!jobId || !applicationIds.length) {
        throw new Error("A shortlist precisa de uma vaga e pelo menos uma aplicacao.");
      }

      const job = await prisma.job.findFirst({
        where: {
          id: jobId,
          organizationId: input.organizationId
        }
      });

      if (!job) {
        throw new Error("Vaga nao encontrada no workspace atual.");
      }

      return `Salvar a shortlist "${name}" para a vaga ${job.title} com ${applicationIds.length} aplicacoes.`;
    },
    async execute(input) {
      const jobId = asString(input.payload.jobId);
      const name = asString(input.payload.name) ?? "Shortlist";
      const applicationIds = Array.isArray(input.payload.applicationIds)
        ? input.payload.applicationIds.filter((value): value is string => typeof value === "string")
        : [];

      if (!jobId || !applicationIds.length) {
        throw new Error("Chat action is missing shortlist context.");
      }

      const matchingApplications = await prisma.application.count({
        where: {
          organizationId: input.organizationId,
          jobId,
          id: {
            in: applicationIds
          }
        }
      });

      if (matchingApplications !== applicationIds.length) {
        throw new Error("Chat action contains applications outside the current workspace.");
      }

      const shortlist = await prisma.savedShortlist.create({
        data: {
          organizationId: input.organizationId,
          jobId,
          createdById: input.userId,
          name,
          applicationIds: applicationIds as unknown as Prisma.InputJsonValue
        }
      });

      return {
        summary: "Shortlist salva com sucesso pelo agente corporativo.",
        targetType: "saved_shortlist",
        targetId: shortlist.id,
        resultPayload: asJsonValue({
          shortlistId: shortlist.id,
          applicationIds
        })
      };
    }
  },
  draft_email: {
    type: "draft_email",
    label: "Preparar rascunho",
    riskLevel: AgentRiskLevel.LOW,
    requiresApproval: false,
    async buildPreview(input) {
      const subject = asString(input.payload.subject);

      if (!subject) {
        throw new Error("O rascunho precisa de um assunto.");
      }

      return `Preparar um rascunho de email com o assunto "${subject}".`;
    },
    async execute(input) {
      const subject = asString(input.payload.subject);
      const body = asString(input.payload.body);
      const to = asString(input.payload.to);

      if (!subject || !body) {
        throw new Error("Chat action is missing email draft data.");
      }

      return {
        summary: `Rascunho pronto: ${subject}.`,
        targetType: "email_draft",
        targetId: null,
        resultPayload: asJsonValue({
          subject,
          body,
          to
        })
      };
    }
  },
  schedule_interview: {
    type: "schedule_interview",
    label: "Agendar entrevista",
    riskLevel: AgentRiskLevel.MEDIUM,
    requiresApproval: false,
    requiredPermission: "manage_interviews",
    async buildPreview(input) {
      const applicationId = asString(input.payload.applicationId);
      const startsAt = asDate(input.payload.startsAt);

      if (!applicationId || !startsAt) {
        throw new Error("O agendamento precisa de uma aplicacao e horario de inicio.");
      }

      const application = await getApplicationContext(input.organizationId, applicationId);

      return `Agendar entrevista para ${application.candidate.fullName} em ${startsAt.toLocaleString("pt-BR")}.`;
    },
    async execute(input) {
      const applicationId = asString(input.payload.applicationId);
      const title = asString(input.payload.title) ?? "Entrevista";
      const startsAt = asDate(input.payload.startsAt);
      const endsAt = asDate(input.payload.endsAt);

      if (!applicationId || !startsAt || !endsAt) {
        throw new Error("Chat action is missing interview scheduling data.");
      }

      const application = await prisma.application.findFirst({
        where: {
          id: applicationId,
          organizationId: input.organizationId
        }
      });

      if (!application) {
        throw new Error("Application not found for interview scheduling.");
      }

      const interview = await prisma.interview.create({
        data: {
          organizationId: input.organizationId,
          applicationId: application.id,
          scheduledById: input.userId,
          title,
          startsAt,
          endsAt,
          notes: "Agendamento iniciado via agente corporativo."
        }
      });

      return {
        summary: "Entrevista criada a partir do agente corporativo.",
        targetType: "interview",
        targetId: interview.id,
        resultPayload: asJsonValue({
          interviewId: interview.id,
          applicationId: application.id
        })
      };
    }
  },
  create_onboarding_plan: {
    type: "create_onboarding_plan",
    label: "Criar onboarding",
    riskLevel: AgentRiskLevel.MEDIUM,
    requiresApproval: false,
    requiredPermission: "manage_people_workflows",
    async buildPreview(input) {
      const employeeId = asString(input.payload.employeeId);

      if (!employeeId) {
        throw new Error("O onboarding precisa de um colaborador.");
      }

      const employee = await getEmployeeContext(input.organizationId, employeeId);
      return `Criar o plano de onboarding de ${employee.fullName}.`;
    },
    async execute(input) {
      const employeeId = asString(input.payload.employeeId);

      if (!employeeId) {
        throw new Error("Chat action is missing employee context.");
      }

      const run = await createWorkflowRunFromTemplate({
        organizationId: input.organizationId,
        employeeId,
        createdById: input.userId,
        kind: PeopleWorkflowKind.ONBOARDING
      });

      return {
        summary: "Onboarding criado a partir do agente corporativo.",
        targetType: "people_workflow_run",
        targetId: run.id,
        resultPayload: asJsonValue({
          workflowRunId: run.id,
          kind: run.kind
        })
      };
    }
  },
  create_offboarding_plan: {
    type: "create_offboarding_plan",
    label: "Criar offboarding",
    riskLevel: AgentRiskLevel.HIGH,
    requiresApproval: true,
    requiredPermission: "manage_people_workflows",
    async buildPreview(input) {
      const employeeId = asString(input.payload.employeeId);

      if (!employeeId) {
        throw new Error("O offboarding precisa de um colaborador.");
      }

      const employee = await getEmployeeContext(input.organizationId, employeeId);
      return `Criar o plano de offboarding de ${employee.fullName}.`;
    },
    async execute(input) {
      const employeeId = asString(input.payload.employeeId);

      if (!employeeId) {
        throw new Error("Chat action is missing employee context.");
      }

      const run = await createWorkflowRunFromTemplate({
        organizationId: input.organizationId,
        employeeId,
        createdById: input.userId,
        kind: PeopleWorkflowKind.OFFBOARDING
      });

      return {
        summary: "Offboarding criado a partir do agente corporativo.",
        targetType: "people_workflow_run",
        targetId: run.id,
        resultPayload: asJsonValue({
          workflowRunId: run.id,
          kind: run.kind
        })
      };
    }
  },
  create_hr_request: {
    type: "create_hr_request",
    label: "Criar solicitacao interna",
    riskLevel: AgentRiskLevel.LOW,
    requiresApproval: false,
    async buildPreview(input) {
      const title = asString(input.payload.title);
      const category = (asString(input.payload.category) as HrRequestCategory | null) ?? HrRequestCategory.GENERAL_SUPPORT;

      if (!title) {
        throw new Error("A solicitacao interna precisa de um titulo.");
      }

      return `Abrir uma solicitacao interna na categoria ${category.toLowerCase()} com o titulo "${title}".`;
    },
    async execute(input) {
      const title = asString(input.payload.title);
      const description = asString(input.payload.description);
      const requesterEmployeeId = asString(input.payload.requesterEmployeeId);
      const assigneeUserId = asString(input.payload.assigneeUserId);
      const category = (asString(input.payload.category) as HrRequestCategory | null) ?? HrRequestCategory.GENERAL_SUPPORT;
      const priority = (asString(input.payload.priority) as PeopleTaskPriority | null) ?? PeopleTaskPriority.MEDIUM;
      const dueAt = asDate(input.payload.dueAt);

      if (!title || !description) {
        throw new Error("Chat action is missing HR request data.");
      }

      const request = await createHrRequest({
        organizationId: input.organizationId,
        actorId: input.userId,
        data: {
          requesterEmployeeId: requesterEmployeeId ?? undefined,
          assigneeUserId: assigneeUserId ?? undefined,
          title,
          description,
          category,
          priority,
          dueAt: dueAt ?? undefined
        }
      });

      return {
        summary: "Solicitacao interna criada via agente corporativo.",
        targetType: "hr_request",
        targetId: request.id,
        resultPayload: asJsonValue({
          requestId: request.id
        })
      };
    }
  },
  update_hr_request: {
    type: "update_hr_request",
    label: "Atualizar solicitacao interna",
    riskLevel: AgentRiskLevel.MEDIUM,
    requiresApproval: false,
    requiredPermission: "manage_hr_requests",
    async buildPreview(input) {
      const requestId = asString(input.payload.requestId);
      const status = (asString(input.payload.status) as HrRequestStatus | null) ?? HrRequestStatus.IN_PROGRESS;

      if (!requestId) {
        throw new Error("A atualizacao precisa de uma solicitacao.");
      }

      const request = await getHrRequestContext(input.organizationId, requestId);
      return `Atualizar a solicitacao "${request.title}" para ${status.toLowerCase()}.`;
    },
    async execute(input) {
      const requestId = asString(input.payload.requestId);
      const status = asString(input.payload.status) as HrRequestStatus | null;

      if (!requestId || !status) {
        throw new Error("Chat action is missing HR request update data.");
      }

      const updated = await updateHrRequestStatus({
        organizationId: input.organizationId,
        actorId: input.userId,
        requestId,
        status
      });

      return {
        summary: "Solicitacao interna atualizada via agente corporativo.",
        targetType: "hr_request",
        targetId: updated.id,
        resultPayload: asJsonValue({
          requestId: updated.id,
          status: updated.status
        })
      };
    }
  },
  create_people_task: {
    type: "create_people_task",
    label: "Criar people task",
    riskLevel: AgentRiskLevel.LOW,
    requiresApproval: false,
    requiredPermission: "manage_people_tasks",
    async buildPreview(input) {
      const title = asString(input.payload.title);

      if (!title) {
        throw new Error("A people task precisa de um titulo.");
      }

      return `Criar uma people task com o titulo "${title}".`;
    },
    async execute(input) {
      const title = asString(input.payload.title);
      const description = asString(input.payload.description);
      const assigneeUserId = asString(input.payload.assigneeUserId);
      const assigneeEmployeeId = asString(input.payload.assigneeEmployeeId);
      const relatedEmployeeId = asString(input.payload.relatedEmployeeId);
      const priority = (asString(input.payload.priority) as PeopleTaskPriority | null) ?? PeopleTaskPriority.MEDIUM;
      const dueAt = asDate(input.payload.dueAt);
      const sourceType = asString(input.payload.sourceType) ?? "chat";
      const sourceId = asString(input.payload.sourceId);

      if (!title) {
        throw new Error("Chat action is missing people task data.");
      }

      const task = await createPeopleTask({
        organizationId: input.organizationId,
        actorId: input.userId,
        data: {
          title,
          description: description ?? undefined,
          assigneeUserId: assigneeUserId ?? undefined,
          assigneeEmployeeId: assigneeEmployeeId ?? undefined,
          relatedEmployeeId: relatedEmployeeId ?? undefined,
          priority,
          dueAt: dueAt ?? undefined,
          sourceType,
          sourceId: sourceId ?? undefined
        }
      });

      return {
        summary: "People task criada via agente corporativo.",
        targetType: "people_task",
        targetId: task.id,
        resultPayload: asJsonValue({
          taskId: task.id
        })
      };
    }
  },
  update_people_task: {
    type: "update_people_task",
    label: "Atualizar people task",
    riskLevel: AgentRiskLevel.MEDIUM,
    requiresApproval: false,
    requiredPermission: "manage_people_tasks",
    async buildPreview(input) {
      const taskId = asString(input.payload.taskId);
      const status = (asString(input.payload.status) as PeopleTaskStatus | null) ?? PeopleTaskStatus.IN_PROGRESS;

      if (!taskId) {
        throw new Error("A atualizacao precisa de uma people task.");
      }

      const task = await getPeopleTaskContext(input.organizationId, taskId);
      return `Atualizar a people task "${task.title}" para ${status.toLowerCase()}.`;
    },
    async execute(input) {
      const taskId = asString(input.payload.taskId);
      const status = asString(input.payload.status) as PeopleTaskStatus | null;

      if (!taskId || !status) {
        throw new Error("Chat action is missing people task update data.");
      }

      const updated = await updatePeopleTaskStatus({
        organizationId: input.organizationId,
        actorId: input.userId,
        taskId,
        status
      });

      return {
        summary: "People task atualizada via agente corporativo.",
        targetType: "people_task",
        targetId: updated.id,
        resultPayload: asJsonValue({
          taskId: updated.id,
          status: updated.status
        })
      };
    }
  }
};

export function getAgentActionDefinition(type: CompanyChatActionType) {
  return actionRegistry[type];
}

export function enrichAgentActionProposal(proposal: CompanyChatActionProposal): CompanyChatActionProposal {
  const definition = getAgentActionDefinition(proposal.type);

  return {
    ...proposal,
    label: proposal.label || definition.label,
    riskLevel: definition.riskLevel,
    requiresApproval: definition.requiresApproval
  };
}
