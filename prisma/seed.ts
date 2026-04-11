import {
  AgentApprovalStatus,
  AgentExecutionStatus,
  AgentRiskLevel,
  AgentRunMode,
  AgentRunStatus,
  AgentStepStatus,
  AutomationTrigger,
  BillingPlan,
  BillingStatus,
  ChatMessageRole,
  ComplianceRequirementType,
  CriterionType,
  EmployeeCheckInType,
  EmployeeStatus,
  EmailTemplateType,
  HrRequestCategory,
  HrRequestStatus,
  InterviewRecommendation,
  JobStatus,
  KnowledgeDocumentType,
  PeopleEventType,
  PeopleTaskPriority,
  PeopleTaskStatus,
  PeopleWorkflowKind,
  PeopleWorkflowStepStatus,
  SavedViewType,
  UserRole
} from "@prisma/client";

import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma/client";
import { createWorkflowRunFromTemplate, updateWorkflowStepStatus } from "@/modules/people-ops/service";

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "hireflow-demo" },
    update: {
      name: "Atlas Meridian",
      billingPlan: BillingPlan.GROWTH,
      billingStatus: BillingStatus.TRIALING,
      billingTrialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      billingExtraSeats: 2,
      billingAiAddonUnits: 1
    },
    create: {
      name: "Atlas Meridian",
      slug: "hireflow-demo",
      sizeRange: "10-200",
      billingPlan: BillingPlan.GROWTH,
      billingStatus: BillingStatus.TRIALING,
      billingTrialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      billingExtraSeats: 2,
      billingAiAddonUnits: 1
    }
  });

  const passwordHash = await hashPassword(process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!");

  const admin = await prisma.user.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL ?? "founder@hireflow.ai" },
    update: {
      organizationId: organization.id,
      passwordHash
    },
    create: {
      name: "Founder Admin",
      email: process.env.SEED_ADMIN_EMAIL ?? "founder@hireflow.ai",
      passwordHash,
      role: UserRole.OWNER,
      organizationId: organization.id,
      memberships: {
        create: {
          organizationId: organization.id,
          role: UserRole.OWNER,
          isDefault: true
        }
      }
    }
  });

  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: admin.id
      }
    },
    update: {
      role: UserRole.OWNER,
      isDefault: true
    },
    create: {
      organizationId: organization.id,
      userId: admin.id,
      role: UserRole.OWNER,
      isDefault: true
    }
  });

  const secondOrganization = await prisma.organization.upsert({
    where: { slug: "hireflow-labs" },
    update: {
      name: "Meridian Works",
      billingPlan: BillingPlan.BUSINESS,
      billingStatus: BillingStatus.ACTIVE,
      billingContractedMrrCents: 590000
    },
    create: {
      name: "Meridian Works",
      slug: "hireflow-labs",
      sizeRange: "50-120",
      billingPlan: BillingPlan.BUSINESS,
      billingStatus: BillingStatus.ACTIVE,
      billingContractedMrrCents: 590000
    }
  });

  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: secondOrganization.id,
        userId: admin.id
      }
    },
    update: {
      role: UserRole.ADMIN,
      isDefault: false
    },
    create: {
      organizationId: secondOrganization.id,
      userId: admin.id,
      role: UserRole.ADMIN,
      isDefault: false
    }
  });

  const peopleOpsUser = await prisma.user.upsert({
    where: { email: "marina.alves@hireflow.ai" },
    update: {
      name: "Marina Alves",
      organizationId: organization.id,
      passwordHash,
      role: UserRole.PEOPLE_OPS
    },
    create: {
      name: "Marina Alves",
      email: "marina.alves@hireflow.ai",
      passwordHash,
      role: UserRole.PEOPLE_OPS,
      organizationId: organization.id
    }
  });

  const managerUser = await prisma.user.upsert({
    where: { email: "livia.rocha@hireflow.ai" },
    update: {
      name: "Livia Rocha",
      organizationId: organization.id,
      passwordHash,
      role: UserRole.MANAGER
    },
    create: {
      name: "Livia Rocha",
      email: "livia.rocha@hireflow.ai",
      passwordHash,
      role: UserRole.MANAGER,
      organizationId: organization.id
    }
  });

  const employeeUser = await prisma.user.upsert({
    where: { email: "ana.costa@hireflow.ai" },
    update: {
      name: "Ana Costa",
      organizationId: organization.id,
      passwordHash,
      role: UserRole.EMPLOYEE
    },
    create: {
      name: "Ana Costa",
      email: "ana.costa@hireflow.ai",
      passwordHash,
      role: UserRole.EMPLOYEE,
      organizationId: organization.id
    }
  });

  for (const member of [
    { userId: peopleOpsUser.id, role: UserRole.PEOPLE_OPS },
    { userId: managerUser.id, role: UserRole.MANAGER },
    { userId: employeeUser.id, role: UserRole.EMPLOYEE }
  ]) {
    await prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: member.userId
        }
      },
      update: {
        role: member.role,
        isDefault: true
      },
      create: {
        organizationId: organization.id,
        userId: member.userId,
        role: member.role,
        isDefault: true
      }
    });
  }

  const stages = [
    { key: "applied", name: "Aplicado", position: 1, isDefault: true, color: "#245c43" },
    { key: "screening", name: "Triagem", position: 2, color: "#347e5a" },
    { key: "interview", name: "Entrevista", position: 3, color: "#5aa078" },
    { key: "offer", name: "Oferta", position: 4, color: "#9abf72" },
    { key: "rejected", name: "Reprovado", position: 5, isTerminal: true, color: "#b2553d" }
  ];

  for (const stage of stages) {
    await prisma.pipelineStage.upsert({
      where: {
        organizationId_key: {
          organizationId: organization.id,
          key: stage.key
        }
      },
      update: stage,
      create: {
        organizationId: organization.id,
        name: stage.name,
        key: stage.key,
        position: stage.position,
        isDefault: stage.isDefault ?? false,
        isTerminal: stage.isTerminal ?? false,
        color: stage.color
      }
    });
  }

  const defaultJob = await prisma.job.upsert({
    where: { id: "seed-job-product-engineer" },
    update: {},
    create: {
      id: "seed-job-product-engineer",
      organizationId: organization.id,
      createdById: admin.id,
      title: "Senior Product Engineer",
      department: "Product & Engineering",
      location: "Sao Paulo / Remoto",
      employmentType: "CLT / Full-time",
      seniority: "Senior",
      status: JobStatus.OPEN,
      summary:
        "Pessoa engenheira de produto para liderar entregas end-to-end em uma plataforma SaaS B2B com forte uso de IA.",
      description:
        "Você vai atuar do discovery ao deploy, colaborando com produto, design e operações para construir fluxos de recrutamento com alta confiabilidade e excelente experiência de uso.",
      educationLevel: "Ensino superior completo",
      minExperienceYears: 5,
      criteria: {
        create: [
          {
            type: CriterionType.MUST_HAVE,
            label: "Experiência com Next.js, TypeScript e arquitetura full-stack",
            weight: 10,
            order: 0
          },
          {
            type: CriterionType.MUST_HAVE,
            label: "Capacidade de atuar como product engineer com autonomia",
            weight: 9,
            order: 1
          },
          {
            type: CriterionType.NICE_TO_HAVE,
            label: "Vivencia com IA aplicada a produtos SaaS",
            weight: 7,
            order: 2
          }
        ]
      }
    }
  });

  const appliedStage = await prisma.pipelineStage.findFirstOrThrow({
    where: {
      organizationId: organization.id,
      isDefault: true
    }
  });
  const interviewStage = await prisma.pipelineStage.findFirstOrThrow({
    where: {
      organizationId: organization.id,
      key: "interview"
    }
  });
  const rejectedStage = await prisma.pipelineStage.findFirstOrThrow({
    where: {
      organizationId: organization.id,
      key: "rejected"
    }
  });

  await prisma.jobScorecardItem.upsert({
    where: { id: "seed-scorecard-product-sense" },
    update: {},
    create: {
      id: "seed-scorecard-product-sense",
      organizationId: organization.id,
      jobId: defaultJob.id,
      label: "Product sense",
      category: "Discovery",
      description: "Capacidade de traduzir contexto de negócio em decisoes de produto e trade-offs claros.",
      weight: 8,
      isRequired: true,
      order: 0
    }
  });

  await prisma.jobScorecardItem.upsert({
    where: { id: "seed-scorecard-execution" },
    update: {},
    create: {
      id: "seed-scorecard-execution",
      organizationId: organization.id,
      jobId: defaultJob.id,
      label: "Execucao full-stack",
      category: "Execution",
      description: "Autonomia para ir de discovery a deploy com boa disciplina tecnica.",
      weight: 9,
      isRequired: true,
      order: 1
    }
  });

  await prisma.jobScorecardItem.upsert({
    where: { id: "seed-scorecard-collaboration" },
    update: {},
    create: {
      id: "seed-scorecard-collaboration",
      organizationId: organization.id,
      jobId: defaultJob.id,
      label: "Colaboração cross-functional",
      category: "Collaboration",
      description: "Qualidade da parceria com design, produto e operações em ambientes ambiciosos.",
      weight: 7,
      isRequired: false,
      order: 2
    }
  });

  await prisma.jobAutomationRule.upsert({
    where: {
      jobId_trigger: {
        jobId: defaultJob.id,
        trigger: AutomationTrigger.INTERVIEW_CREATED
      }
    },
    update: {},
    create: {
      organizationId: organization.id,
      jobId: defaultJob.id,
      trigger: AutomationTrigger.INTERVIEW_CREATED,
      targetStageId: interviewStage.id,
      enabled: true,
      notes: "Ao agendar entrevista, mover automaticamente para a etapa de entrevista."
    }
  });

  await prisma.departmentPlaybook.upsert({
    where: {
      organizationId_department: {
        organizationId: organization.id,
        department: "Product & Engineering"
      }
    },
    update: {},
    create: {
      organizationId: organization.id,
      department: "Product & Engineering",
      title: "Playbook para product engineers",
      screeningGuidance:
        "Priorize ownership end-to-end, repertorio em SaaS B2B e sinais de colaboração forte com design e produto.",
      interviewGuidance:
        "Explore trade-offs de produto, qualidade tecnica, velocidade de entrega e maturidade para operar com contexto incompleto.",
      decisionGuidance:
        "Avance perfis que combinem critério técnico, pensamento de produto e alta autonomia. Segure quando houver potencial, mas faltarem evidencias de execucao real.",
      strongSignals: [
        "Exemplos concretos de discovery ate deploy",
        "Boa articulacao entre usuário, negócio e arquitetura",
        "Ownership cross-functional consistente"
      ],
      riskSignals: [
        "Discurso forte, mas sem exemplos de entrega real",
        "Baixa clareza sobre priorizacao e trade-offs",
        "Experiência muito especializada sem contexto de produto"
      ]
    }
  });

  await prisma.knowledgeDocument.upsert({
    where: { id: "seed-knowledge-playbook-product" },
    update: {},
    create: {
      id: "seed-knowledge-playbook-product",
      organizationId: organization.id,
      createdById: admin.id,
      title: "Playbook operacional - Product Engineering",
      description: "Guia de triagem, sinais fortes e riscos para vagas de product engineer.",
      type: KnowledgeDocumentType.PLAYBOOK,
      status: "READY",
      summary:
        "Documento orienta triagem de product engineers, destacando ownership end-to-end, repertorio em SaaS B2B, critério técnico e clareza em trade-offs de produto.",
      extractedText:
        "Priorize ownership end-to-end, repertorio em SaaS B2B, colaboração com design e produto, clareza de trade-offs e exemplos concretos de discovery ate deploy. Riscos incluem baixa capacidade de priorizacao, ausencia de evidencias de entrega real e pouca articulacao com negócio.",
      processedAt: new Date()
    }
  });

  await prisma.knowledgeChunk.upsert({
    where: {
      documentId_position: {
        documentId: "seed-knowledge-playbook-product",
        position: 0
      }
    },
    update: {},
    create: {
      organizationId: organization.id,
      documentId: "seed-knowledge-playbook-product",
      position: 0,
      content:
        "Priorize ownership end-to-end, repertorio em SaaS B2B, colaboração com design e produto, clareza de trade-offs e exemplos concretos de discovery ate deploy.",
      tokenCount: 36,
      keywords: ["ownership", "saas", "produto", "trade-offs", "discovery"]
    }
  });

  await prisma.jobAutomationRule.upsert({
    where: {
      jobId_trigger: {
        jobId: defaultJob.id,
        trigger: AutomationTrigger.FEEDBACK_REJECTED
      }
    },
    update: {},
    create: {
      organizationId: organization.id,
      jobId: defaultJob.id,
      trigger: AutomationTrigger.FEEDBACK_REJECTED,
      targetStageId: rejectedStage.id,
      enabled: true,
      notes: "Feedback negativo encerra automaticamente a candidatura."
    }
  });

  const candidate = await prisma.candidate.upsert({
    where: { id: "seed-candidate-ana-costa" },
    update: {},
    create: {
      id: "seed-candidate-ana-costa",
      organizationId: organization.id,
      fullName: "Ana Costa",
      email: "ana.costa@example.com",
      phone: "+55 11 99999-1111",
      location: "Sao Paulo, BR",
      summary: "Engenheira de produto com foco em SaaS B2B e automações de RH.",
      yearsExperience: 7,
      highestEducation: "Ciencia da Computacao",
      currentTitle: "Senior Software Engineer",
      currentCompany: "TalentStack",
      parsedProfile: {
        skills: ["Next.js", "TypeScript", "Prisma", "OpenAI"],
        industries: ["HR Tech", "SaaS B2B"]
      }
    }
  });

  await prisma.application.upsert({
    where: {
      jobId_candidateId: {
        jobId: defaultJob.id,
        candidateId: candidate.id
      }
    },
    update: {},
    create: {
      organizationId: organization.id,
      jobId: defaultJob.id,
      candidateId: candidate.id,
      currentStageId: appliedStage.id,
      score: 88,
      scoreJustification:
        "Alta aderência em stack, senioridade e contexto de produto. Gap pequeno em liderança formal de time.",
      executiveSummary:
        "Perfil forte para fase de triagem. Demonstra experiência relevante em SaaS e boa aderência tecnica.",
      strengths: ["Experiência em produto", "Stack aderente", "Contexto em RH tech"],
      gaps: ["Sem histórico claro de gestão formal"],
      detectedSkills: ["Next.js", "TypeScript", "Prisma", "OpenAI"],
      detectedExperience: {
        years: 7,
        highlights: ["SaaS B2B", "Fluxos de recrutamento"]
      },
      suggestedQuestions: [
        "Como você prioriza trade-offs entre velocidade de entrega e qualidade arquitetural?",
        "Conte um caso em que usou IA para reduzir trabalho operacional em um produto."
      ],
      history: {
        create: {
          toStageId: appliedStage.id,
          movedById: admin.id,
          notes: "Candidatura seed criada para demonstracao."
        }
      }
    }
  });

  const seededApplication = await prisma.application.findUniqueOrThrow({
    where: {
      jobId_candidateId: {
        jobId: defaultJob.id,
        candidateId: candidate.id
      }
    }
  });

  const peopleOpsEmployee = await prisma.employee.upsert({
    where: { id: "seed-employee-marina-alves" },
    update: {
      linkedUserId: peopleOpsUser.id,
      fullName: "Marina Alves",
      title: "People Ops Lead",
      department: "People Ops",
      location: "Sao Paulo, BR",
      employmentType: "CLT",
      status: EmployeeStatus.ACTIVE,
      startDate: new Date("2025-08-11T09:00:00.000Z")
    },
    create: {
      id: "seed-employee-marina-alves",
      organizationId: organization.id,
      linkedUserId: peopleOpsUser.id,
      fullName: "Marina Alves",
      workEmail: "marina.alves@hireflow.ai",
      title: "People Ops Lead",
      department: "People Ops",
      location: "Sao Paulo, BR",
      employmentType: "CLT",
      status: EmployeeStatus.ACTIVE,
      startDate: new Date("2025-08-11T09:00:00.000Z"),
      notes: "Responsavel pela operação di?ria de RH, service desk e onboarding."
    }
  });

  const managerEmployee = await prisma.employee.upsert({
    where: { id: "seed-employee-livia-rocha" },
    update: {
      linkedUserId: managerUser.id,
      fullName: "Livia Rocha",
      title: "Director of Product",
      department: "Product & Engineering",
      location: "Sao Paulo, BR",
      employmentType: "CLT",
      status: EmployeeStatus.ACTIVE,
      startDate: new Date("2025-05-05T09:00:00.000Z")
    },
    create: {
      id: "seed-employee-livia-rocha",
      organizationId: organization.id,
      linkedUserId: managerUser.id,
      fullName: "Livia Rocha",
      workEmail: "livia.rocha@hireflow.ai",
      title: "Director of Product",
      department: "Product & Engineering",
      location: "Sao Paulo, BR",
      employmentType: "CLT",
      status: EmployeeStatus.ACTIVE,
      startDate: new Date("2025-05-05T09:00:00.000Z"),
      notes: "Gestora responsavel pelo período inicial do time de produto."
    }
  });

  const hiredEmployee = await prisma.employee.upsert({
    where: { id: "seed-employee-ana-costa" },
    update: {
      linkedUserId: employeeUser.id,
      sourceApplicationId: seededApplication.id,
      managerEmployeeId: managerEmployee.id,
      fullName: "Ana Costa",
      title: "Senior Product Engineer",
      department: "Product & Engineering",
      location: "Sao Paulo / Remoto",
      employmentType: "CLT",
      status: EmployeeStatus.ONBOARDING,
      startDate: new Date("2026-03-24T09:00:00.000Z")
    },
    create: {
      id: "seed-employee-ana-costa",
      organizationId: organization.id,
      linkedUserId: employeeUser.id,
      sourceApplicationId: seededApplication.id,
      managerEmployeeId: managerEmployee.id,
      fullName: "Ana Costa",
      workEmail: "ana.costa@hireflow.ai",
      personalEmail: "ana.costa@example.com",
      phone: "+55 11 99999-1111",
      title: "Senior Product Engineer",
      department: "Product & Engineering",
      location: "Sao Paulo / Remoto",
      employmentType: "CLT",
      status: EmployeeStatus.ONBOARDING,
      startDate: new Date("2026-03-24T09:00:00.000Z"),
      notes: "Nova contratacao vinda do módulo de hiring, agora acompanhada pelo People Ops Hub."
    }
  });

  const offboardingEmployee = await prisma.employee.upsert({
    where: { id: "seed-employee-pedro-lima" },
    update: {
      fullName: "Pedro Lima",
      managerEmployeeId: peopleOpsEmployee.id,
      title: "People Operations Specialist",
      department: "People Ops",
      location: "Curitiba, BR",
      employmentType: "CLT",
      status: EmployeeStatus.OFFBOARDING,
      startDate: new Date("2024-11-04T09:00:00.000Z"),
      endDate: new Date("2026-03-28T18:00:00.000Z")
    },
    create: {
      id: "seed-employee-pedro-lima",
      organizationId: organization.id,
      fullName: "Pedro Lima",
      workEmail: "pedro.lima@hireflow.ai",
      managerEmployeeId: peopleOpsEmployee.id,
      title: "People Operations Specialist",
      department: "People Ops",
      location: "Curitiba, BR",
      employmentType: "CLT",
      status: EmployeeStatus.OFFBOARDING,
      startDate: new Date("2024-11-04T09:00:00.000Z"),
      endDate: new Date("2026-03-28T18:00:00.000Z"),
      notes: "Fluxo de desligamento criado para validar checklist, acessos e entrevista de saída."
    }
  });

  const onboardingRun = await createWorkflowRunFromTemplate({
    organizationId: organization.id,
    employeeId: hiredEmployee.id,
    createdById: peopleOpsUser.id,
    kind: PeopleWorkflowKind.ONBOARDING
  });

  const offboardingRun = await createWorkflowRunFromTemplate({
    organizationId: organization.id,
    employeeId: offboardingEmployee.id,
    createdById: peopleOpsUser.id,
    kind: PeopleWorkflowKind.OFFBOARDING
  });

  if (onboardingRun.steps[0] && onboardingRun.steps[0].status !== PeopleWorkflowStepStatus.DONE) {
    await updateWorkflowStepStatus({
      organizationId: organization.id,
      actorId: peopleOpsUser.id,
      stepId: onboardingRun.steps[0].id,
      status: PeopleWorkflowStepStatus.DONE
    });
  }

  if (onboardingRun.steps[1] && onboardingRun.steps[1].status !== PeopleWorkflowStepStatus.IN_PROGRESS) {
    await updateWorkflowStepStatus({
      organizationId: organization.id,
      actorId: peopleOpsUser.id,
      stepId: onboardingRun.steps[1].id,
      status: PeopleWorkflowStepStatus.IN_PROGRESS
    });
  }

  if (offboardingRun.steps[0] && offboardingRun.steps[0].status !== PeopleWorkflowStepStatus.DONE) {
    await updateWorkflowStepStatus({
      organizationId: organization.id,
      actorId: peopleOpsUser.id,
      stepId: offboardingRun.steps[0].id,
      status: PeopleWorkflowStepStatus.DONE
    });
  }

  await prisma.peopleTask.upsert({
    where: { id: "seed-task-manager-checkin" },
    update: {
      assigneeUserId: managerUser.id,
      relatedEmployeeId: hiredEmployee.id,
      status: PeopleTaskStatus.IN_PROGRESS,
      priority: PeopleTaskPriority.HIGH,
      dueAt: new Date("2026-03-25T15:00:00.000Z")
    },
    create: {
      id: "seed-task-manager-checkin",
      organizationId: organization.id,
      title: "Registrar alinhamento inicial com Ana Costa",
      description: "Coletar contexto dos primeiros dias, riscos do período inicial e próximos passos com a nova contratacao.",
      assigneeUserId: managerUser.id,
      relatedEmployeeId: hiredEmployee.id,
      createdById: peopleOpsUser.id,
      sourceType: "manual",
      priority: PeopleTaskPriority.HIGH,
      status: PeopleTaskStatus.IN_PROGRESS,
      dueAt: new Date("2026-03-25T15:00:00.000Z")
    }
  });

  await prisma.peopleTask.upsert({
    where: { id: "seed-task-offboarding-devices" },
    update: {
      assigneeUserId: peopleOpsUser.id,
      relatedEmployeeId: offboardingEmployee.id,
      status: PeopleTaskStatus.TODO,
      priority: PeopleTaskPriority.URGENT,
      dueAt: new Date("2026-03-22T12:00:00.000Z")
    },
    create: {
      id: "seed-task-offboarding-devices",
      organizationId: organization.id,
      title: "Confirmar devolucao de notebook e acessos de Pedro Lima",
      description: "Garantir encerramento de ferramentas, recolhimento de ativos e checklist final do desligamento.",
      assigneeUserId: peopleOpsUser.id,
      relatedEmployeeId: offboardingEmployee.id,
      createdById: admin.id,
      sourceType: "manual",
      priority: PeopleTaskPriority.URGENT,
      status: PeopleTaskStatus.TODO,
      dueAt: new Date("2026-03-22T12:00:00.000Z")
    }
  });

  await prisma.employeeCheckIn.upsert({
    where: { id: "seed-checkin-ana-probation" },
    update: {
      employeeId: hiredEmployee.id,
      authorId: managerUser.id,
      type: EmployeeCheckInType.PROBATION,
      title: "Check-in de período inicial",
      summary: "Ana comecou bem, mas ainda depende da finalizacao de acessos e do alinhamento do plano de 30 dias.",
      followUpAt: new Date("2026-04-22T15:00:00.000Z")
    },
    create: {
      id: "seed-checkin-ana-probation",
      organizationId: organization.id,
      employeeId: hiredEmployee.id,
      authorId: managerUser.id,
      type: EmployeeCheckInType.PROBATION,
      title: "Check-in de período inicial",
      summary: "Ana comecou bem, mas ainda depende da finalizacao de acessos e do alinhamento do plano de 30 dias.",
      followUpAt: new Date("2026-04-22T15:00:00.000Z")
    }
  });

  await prisma.employeeCheckIn.upsert({
    where: { id: "seed-checkin-pedro-offboarding" },
    update: {
      employeeId: offboardingEmployee.id,
      authorId: peopleOpsUser.id,
      type: EmployeeCheckInType.NOTE,
      title: "Preparacao de desligamento",
      summary: "Existe risco operacional no handoff de acessos e equipamentos; acompanhar de perto ate o ultimo dia."
    },
    create: {
      id: "seed-checkin-pedro-offboarding",
      organizationId: organization.id,
      employeeId: offboardingEmployee.id,
      authorId: peopleOpsUser.id,
      type: EmployeeCheckInType.NOTE,
      title: "Preparacao de desligamento",
      summary: "Existe risco operacional no handoff de acessos e equipamentos; acompanhar de perto ate o ultimo dia."
    }
  });

  await prisma.hrRequest.upsert({
    where: { id: "seed-request-benefits-ana" },
    update: {
      requesterUserId: employeeUser.id,
      requesterEmployeeId: hiredEmployee.id,
      assigneeUserId: peopleOpsUser.id,
      title: "Adicionar dependente ao plano de saude",
      description: "Solicitação aberta pela nova colaboradora para completar configuração de benefícios.",
      category: HrRequestCategory.BENEFITS,
      priority: PeopleTaskPriority.HIGH,
      status: HrRequestStatus.OPEN,
      dueAt: new Date("2026-03-21T18:00:00.000Z")
    },
    create: {
      id: "seed-request-benefits-ana",
      organizationId: organization.id,
      requesterUserId: employeeUser.id,
      requesterEmployeeId: hiredEmployee.id,
      assigneeUserId: peopleOpsUser.id,
      title: "Adicionar dependente ao plano de saude",
      description: "Solicitação aberta pela nova colaboradora para completar configuração de benefícios.",
      category: HrRequestCategory.BENEFITS,
      priority: PeopleTaskPriority.HIGH,
      status: HrRequestStatus.OPEN,
      dueAt: new Date("2026-03-21T18:00:00.000Z")
    }
  });

  await prisma.hrRequest.upsert({
    where: { id: "seed-request-documents-pedro" },
    update: {
      requesterUserId: admin.id,
      requesterEmployeeId: offboardingEmployee.id,
      assigneeUserId: peopleOpsUser.id,
      title: "Documentacao final do desligamento de Pedro Lima",
      description: "Centralizar assinatura de documentos finais, devolucao de ativos e comprovantes pendentes.",
      category: HrRequestCategory.DOCUMENTS,
      priority: PeopleTaskPriority.URGENT,
      status: HrRequestStatus.IN_PROGRESS,
      dueAt: new Date("2026-03-20T15:00:00.000Z")
    },
    create: {
      id: "seed-request-documents-pedro",
      organizationId: organization.id,
      requesterUserId: admin.id,
      requesterEmployeeId: offboardingEmployee.id,
      assigneeUserId: peopleOpsUser.id,
      title: "Documentacao final do desligamento de Pedro Lima",
      description: "Centralizar assinatura de documentos finais, devolucao de ativos e comprovantes pendentes.",
      category: HrRequestCategory.DOCUMENTS,
      priority: PeopleTaskPriority.URGENT,
      status: HrRequestStatus.IN_PROGRESS,
      dueAt: new Date("2026-03-20T15:00:00.000Z")
    }
  });

  await prisma.hrRequestComment.upsert({
    where: { id: "seed-request-comment-benefits-ana" },
    update: {
      requestId: "seed-request-benefits-ana",
      authorId: peopleOpsUser.id,
      message: "Solicitação recebida. Aguardando comprovante final do dependente.",
      isInternal: false
    },
    create: {
      id: "seed-request-comment-benefits-ana",
      organizationId: organization.id,
      requestId: "seed-request-benefits-ana",
      authorId: peopleOpsUser.id,
      message: "Solicitação recebida. Aguardando comprovante final do dependente.",
      isInternal: false
    }
  });

  await prisma.knowledgeDocument.upsert({
    where: { id: "seed-knowledge-policy-hybrid" },
    update: {
      versionLabel: "v1.0",
      publishedAt: new Date("2026-01-10T14:00:00.000Z"),
      requiresAcknowledgement: true
    },
    create: {
      id: "seed-knowledge-policy-hybrid",
      organizationId: organization.id,
      createdById: peopleOpsUser.id,
      title: "Política interna de trabalho híbrido",
      description: "Regras praticas sobre presen?a, equipamentos, reembolso e janelas de colaboração.",
      type: KnowledgeDocumentType.POLICY,
      status: "READY",
      versionLabel: "v1.0",
      publishedAt: new Date("2026-01-10T14:00:00.000Z"),
      requiresAcknowledgement: true,
      summary: "Política base para orientar regime híbrido, combinados de presen?a e apoio operacional.",
      extractedText:
        "Funcionarios em regime híbrido devem alinhar dias presenciais com a liderança, registrar deslocamentos combinados e seguir os checklists de onboarding e seguranca da informação.",
      processedAt: new Date()
    }
  });

  await prisma.knowledgeDocument.upsert({
    where: { id: "seed-knowledge-policy-hybrid-v2" },
    update: {
      versionLabel: "v2.0",
      publishedAt: new Date("2026-03-15T14:00:00.000Z"),
      requiresAcknowledgement: true,
      supersedesDocumentId: "seed-knowledge-policy-hybrid"
    },
    create: {
      id: "seed-knowledge-policy-hybrid-v2",
      organizationId: organization.id,
      createdById: peopleOpsUser.id,
      title: "Política interna de trabalho híbrido",
      description: "Versao atualizada com regras de deslocamento, janelas presenciais e suporte de equipamento.",
      type: KnowledgeDocumentType.POLICY,
      status: "READY",
      versionLabel: "v2.0",
      publishedAt: new Date("2026-03-15T14:00:00.000Z"),
      requiresAcknowledgement: true,
      supersedesDocumentId: "seed-knowledge-policy-hybrid",
      summary: "Versao atualizada da política hibrida, com reforco de dias presenciais, reembolso e seguranca da informação.",
      extractedText:
        "Funcionarios em regime híbrido devem alinhar dias presenciais com a liderança, registrar deslocamentos combinados, respeitar a janela principal de colaboração presencial e confirmar o aceite da nova versao da política pelo portal interno.",
      processedAt: new Date()
    }
  });

  await prisma.policyRollout.upsert({
    where: { id: "seed-policy-rollout-hybrid-v2" },
    update: {
      title: "Política interna de trabalho híbrido · v2.0",
      dueAt: new Date("2026-03-26T18:00:00.000Z")
    },
    create: {
      id: "seed-policy-rollout-hybrid-v2",
      organizationId: organization.id,
      documentId: "seed-knowledge-policy-hybrid-v2",
      createdById: peopleOpsUser.id,
      title: "Política interna de trabalho híbrido · v2.0",
      dueAt: new Date("2026-03-26T18:00:00.000Z")
    }
  });

  await prisma.policyAcknowledgement.upsert({
    where: { id: "seed-policy-ack-ana-hybrid" },
    update: {
      employeeId: hiredEmployee.id,
      documentId: "seed-knowledge-policy-hybrid-v2",
      policyRolloutId: "seed-policy-rollout-hybrid-v2",
      title: "Aceite da política de trabalho híbrido (v2.0)",
      dueAt: new Date("2026-03-26T18:00:00.000Z"),
      acknowledgedAt: null
    },
    create: {
      id: "seed-policy-ack-ana-hybrid",
      organizationId: organization.id,
      employeeId: hiredEmployee.id,
      documentId: "seed-knowledge-policy-hybrid-v2",
      policyRolloutId: "seed-policy-rollout-hybrid-v2",
      title: "Aceite da política de trabalho híbrido (v2.0)",
      dueAt: new Date("2026-03-26T18:00:00.000Z")
    }
  });

  await prisma.policyAcknowledgement.upsert({
    where: { id: "seed-policy-ack-ana-hybrid-v1" },
    update: {
      employeeId: hiredEmployee.id,
      documentId: "seed-knowledge-policy-hybrid",
      title: "Aceite da política de trabalho híbrido (v1.0)",
      acknowledgedAt: new Date("2026-02-12T16:00:00.000Z")
    },
    create: {
      id: "seed-policy-ack-ana-hybrid-v1",
      organizationId: organization.id,
      employeeId: hiredEmployee.id,
      documentId: "seed-knowledge-policy-hybrid",
      title: "Aceite da política de trabalho híbrido (v1.0)",
      acknowledgedAt: new Date("2026-02-12T16:00:00.000Z")
    }
  });

  await prisma.complianceRequirement.upsert({
    where: { id: "seed-compliance-policy-hybrid-v2" },
    update: {
      employeeId: hiredEmployee.id,
      title: "Aceite da política: Política interna de trabalho híbrido (v2.0)",
      description: "Confirmar leitura e aceite da versao atual da política de trabalho híbrido.",
      type: ComplianceRequirementType.POLICY,
      status: "PENDING",
      dueAt: new Date("2026-03-26T18:00:00.000Z"),
      sourceType: "policy_acknowledgement",
      sourceId: "seed-policy-ack-ana-hybrid",
      completedAt: null
    },
    create: {
      id: "seed-compliance-policy-hybrid-v2",
      organizationId: organization.id,
      employeeId: hiredEmployee.id,
      title: "Aceite da política: Política interna de trabalho híbrido (v2.0)",
      description: "Confirmar leitura e aceite da versao atual da política de trabalho híbrido.",
      type: ComplianceRequirementType.POLICY,
      status: "PENDING",
      dueAt: new Date("2026-03-26T18:00:00.000Z"),
      sourceType: "policy_acknowledgement",
      sourceId: "seed-policy-ack-ana-hybrid"
    }
  });

  await prisma.peopleEvent.upsert({
    where: { id: "seed-event-people-ops-sync" },
    update: {
      title: "People Ops sync da semana",
      description: "Revisão de onboarding, fila de requests, compliance leve e gargalos operacionais.",
      type: PeopleEventType.INTERNAL_EVENT,
      startsAt: new Date("2026-03-19T14:00:00.000Z"),
      endsAt: new Date("2026-03-19T15:00:00.000Z"),
      createdById: peopleOpsUser.id
    },
    create: {
      id: "seed-event-people-ops-sync",
      organizationId: organization.id,
      title: "People Ops sync da semana",
      description: "Revisão de onboarding, fila de requests, compliance leve e gargalos operacionais.",
      type: PeopleEventType.INTERNAL_EVENT,
      startsAt: new Date("2026-03-19T14:00:00.000Z"),
      endsAt: new Date("2026-03-19T15:00:00.000Z"),
      createdById: peopleOpsUser.id
    }
  });

  await prisma.hiringNote.upsert({
    where: { id: "seed-note-initial-screen" },
    update: {},
    create: {
      id: "seed-note-initial-screen",
      organizationId: organization.id,
      authorId: admin.id,
      applicationId: seededApplication.id,
      candidateId: candidate.id,
      content: "Perfil com boa aderência inicial. Vale aprofundar experiência em liderança de discovery e ownership cross-functional."
    }
  });

  await prisma.interview.upsert({
    where: { id: "seed-interview-screening" },
    update: {},
    create: {
      id: "seed-interview-screening",
      organizationId: organization.id,
      applicationId: seededApplication.id,
      scheduledById: admin.id,
      title: "Entrevista de triagem",
      startsAt: new Date(new Date().getTime() + 1000 * 60 * 60 * 24),
      endsAt: new Date(new Date().getTime() + 1000 * 60 * 60 * 25),
      location: "Google Meet",
      meetingUrl: "https://meet.google.com/demo-hireflow-ai",
      notes: "Explorar repertorio em arquitetura de produto e colaboração com design."
    }
  });

  await prisma.interviewFeedback.upsert({
    where: {
      interviewId_authorId: {
        interviewId: "seed-interview-screening",
        authorId: admin.id
      }
    },
    update: {},
    create: {
      organizationId: organization.id,
      interviewId: "seed-interview-screening",
      authorId: admin.id,
      overallScore: 4,
      communicationScore: 5,
      roleFitScore: 4,
      technicalScore: 4,
      recommendation: InterviewRecommendation.YES,
      strengths: "Comunicação clara, repertorio forte em SaaS B2B e ownership consistente de produto.",
      concerns: "Vale aprofundar experiência em liderança formal de squad.",
      notes: "Candidata com boa maturidade para seguir para painel técnico.",
      scorecardRatings: [
        { scorecardItemId: "seed-scorecard-product-sense", score: 4 },
        { scorecardItemId: "seed-scorecard-execution", score: 4 },
        { scorecardItemId: "seed-scorecard-collaboration", score: 5 }
      ]
    }
  });

  await prisma.savedView.upsert({
    where: {
      userId_type_name: {
        userId: admin.id,
        type: SavedViewType.JOBS,
        name: "Vagas abertas"
      }
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: admin.id,
      type: SavedViewType.JOBS,
      name: "Vagas abertas",
      query: "status=OPEN"
    }
  });

  await prisma.organizationInvite.upsert({
    where: {
      token: "seed-team-invite-product"
    },
    update: {},
    create: {
      organizationId: organization.id,
      invitedById: admin.id,
      email: "team.member@example.com",
      role: UserRole.RECRUITER,
      token: "seed-team-invite-product",
      message: "Convite de demonstracao para testar o fluxo de onboarding do time.",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5)
    }
  });

  await prisma.auditEvent.upsert({
    where: {
      id: "seed-audit-interview-created"
    },
    update: {},
    create: {
      id: "seed-audit-interview-created",
      organizationId: organization.id,
      actorId: admin.id,
      action: "interview.created",
      entityType: "interview",
      entityId: "seed-interview-screening",
      summary: 'Entrevista "Entrevista de triagem" agendada para a aplicação.',
      metadata: {
        interviewId: "seed-interview-screening",
        applicationId: seededApplication.id
      }
    }
  });

  await prisma.chatThread.upsert({
    where: { id: "seed-chat-thread-ops" },
    update: {},
    create: {
      id: "seed-chat-thread-ops",
      organizationId: organization.id,
      ownerId: admin.id,
      title: "Health semanal do pipeline"
    }
  });

  await prisma.chatMessage.upsert({
    where: { id: "seed-chat-message-user" },
    update: {},
    create: {
      id: "seed-chat-message-user",
      organizationId: organization.id,
      threadId: "seed-chat-thread-ops",
      authorId: admin.id,
      role: ChatMessageRole.USER,
      content: "Quais candidaturas devo priorizar esta semana?"
    }
  });

  await prisma.chatMessage.upsert({
    where: { id: "seed-chat-message-assistant" },
    update: {},
    create: {
      id: "seed-chat-message-assistant",
      organizationId: organization.id,
      threadId: "seed-chat-thread-ops",
      role: ChatMessageRole.ASSISTANT,
      content:
        "Ana Costa aparece como o principal perfil para priorizacao imediata na vaga de Senior Product Engineer, com score alto e boa aderência ao playbook de Product & Engineering.",
      metadata: {
        suggestedPrompts: [
          "Monte uma shortlist inicial para esta vaga.",
          "Quais riscos devo validar na entrevista?"
        ]
      }
    }
  });

  await prisma.chatThread.upsert({
    where: { id: "seed-chat-thread-people-ops" },
    update: {},
    create: {
      id: "seed-chat-thread-people-ops",
      organizationId: organization.id,
      ownerId: peopleOpsUser.id,
      title: "Pendencias de people ops"
    }
  });

  await prisma.chatMessage.upsert({
    where: { id: "seed-chat-message-people-ops-user" },
    update: {},
    create: {
      id: "seed-chat-message-people-ops-user",
      organizationId: organization.id,
      threadId: "seed-chat-thread-people-ops",
      authorId: peopleOpsUser.id,
      role: ChatMessageRole.USER,
      content: "Quais pendencias de onboarding, requests e compliance merecem prioridade hoje?"
    }
  });

  await prisma.chatMessage.upsert({
    where: { id: "seed-chat-message-people-ops-assistant" },
    update: {},
    create: {
      id: "seed-chat-message-people-ops-assistant",
      organizationId: organization.id,
      threadId: "seed-chat-thread-people-ops",
      role: ChatMessageRole.ASSISTANT,
      content:
        "Ana Costa segue com onboarding ativo e ainda depende da etapa de acessos, enquanto Pedro Lima tem documentacao final e devolucao de ativos pressionando o SLA do offboarding.",
      metadata: {
        suggestedPrompts: [
          "Monte um resumo executivo do command center.",
          "Quais tarefas vencem nas próximas 48 horas?"
        ]
      }
    }
  });

  await prisma.agentRun.upsert({
    where: { id: "seed-agent-run-offboarding-approval" },
    update: {
      organizationId: organization.id,
      startedByUserId: peopleOpsUser.id,
      chatThreadId: "seed-chat-thread-people-ops",
      mode: AgentRunMode.CHAT_ASSISTED,
      goal: "Criar offboarding para Pedro Lima a partir do company chat.",
      actionType: "create_offboarding_plan",
      actionPayload: {
        employeeId: offboardingEmployee.id
      },
      status: AgentRunStatus.WAITING_APPROVAL,
      riskLevel: AgentRiskLevel.HIGH,
      requiresApproval: true,
      summary: "Aprovação solicitada para iniciar o offboarding de Pedro Lima."
    },
    create: {
      id: "seed-agent-run-offboarding-approval",
      organizationId: organization.id,
      startedByUserId: peopleOpsUser.id,
      chatThreadId: "seed-chat-thread-people-ops",
      mode: AgentRunMode.CHAT_ASSISTED,
      goal: "Criar offboarding para Pedro Lima a partir do company chat.",
      actionType: "create_offboarding_plan",
      actionPayload: {
        employeeId: offboardingEmployee.id
      },
      status: AgentRunStatus.WAITING_APPROVAL,
      riskLevel: AgentRiskLevel.HIGH,
      requiresApproval: true,
      summary: "Aprovação solicitada para iniciar o offboarding de Pedro Lima."
    }
  });

  await prisma.agentStep.upsert({
    where: { id: "seed-agent-step-offboarding-plan" },
    update: {
      agentRunId: "seed-agent-run-offboarding-approval",
      kind: "plan",
      title: "Planejar Criar offboarding",
      status: AgentStepStatus.COMPLETED,
      output: {
        preview: "Criar o plano de offboarding de Pedro Lima."
      },
      completedAt: new Date("2026-03-19T14:00:00.000Z")
    },
    create: {
      id: "seed-agent-step-offboarding-plan",
      agentRunId: "seed-agent-run-offboarding-approval",
      kind: "plan",
      title: "Planejar Criar offboarding",
      status: AgentStepStatus.COMPLETED,
      output: {
        preview: "Criar o plano de offboarding de Pedro Lima."
      },
      completedAt: new Date("2026-03-19T14:00:00.000Z")
    }
  });

  await prisma.agentStep.upsert({
    where: { id: "seed-agent-step-offboarding-approval" },
    update: {
      agentRunId: "seed-agent-run-offboarding-approval",
      kind: "approval",
      title: "Aguardar aprovação para Criar offboarding",
      status: AgentStepStatus.WAITING_APPROVAL
    },
    create: {
      id: "seed-agent-step-offboarding-approval",
      agentRunId: "seed-agent-run-offboarding-approval",
      kind: "approval",
      title: "Aguardar aprovação para Criar offboarding",
      status: AgentStepStatus.WAITING_APPROVAL
    }
  });

  await prisma.agentApprovalRequest.upsert({
    where: { id: "seed-agent-approval-offboarding" },
    update: {
      organizationId: organization.id,
      agentRunId: "seed-agent-run-offboarding-approval",
      requestedByUserId: peopleOpsUser.id,
      title: "Aprovar: Criar offboarding",
      summary: "Criar o plano de offboarding de Pedro Lima.",
      riskLevel: AgentRiskLevel.HIGH,
      status: AgentApprovalStatus.PENDING,
      payload: {
        employeeId: offboardingEmployee.id
      },
      expiresAt: new Date("2026-03-22T18:00:00.000Z")
    },
    create: {
      id: "seed-agent-approval-offboarding",
      organizationId: organization.id,
      agentRunId: "seed-agent-run-offboarding-approval",
      requestedByUserId: peopleOpsUser.id,
      title: "Aprovar: Criar offboarding",
      summary: "Criar o plano de offboarding de Pedro Lima.",
      riskLevel: AgentRiskLevel.HIGH,
      status: AgentApprovalStatus.PENDING,
      payload: {
        employeeId: offboardingEmployee.id
      },
      expiresAt: new Date("2026-03-22T18:00:00.000Z")
    }
  });

  await prisma.chatMessage.upsert({
    where: { id: "seed-chat-message-people-ops-system-approval" },
    update: {},
    create: {
      id: "seed-chat-message-people-ops-system-approval",
      organizationId: organization.id,
      threadId: "seed-chat-thread-people-ops",
      authorId: peopleOpsUser.id,
      role: ChatMessageRole.SYSTEM,
      content: "Aprovação solicitada: Criar o plano de offboarding de Pedro Lima.",
      metadata: {
        actionType: "create_offboarding_plan",
        agentExecution: {
          agentRunId: "seed-agent-run-offboarding-approval",
          actionType: "create_offboarding_plan",
          status: "WAITING_APPROVAL",
          mode: "CHAT_ASSISTED",
          riskLevel: "HIGH",
          requiresApproval: true,
          approvalRequestId: "seed-agent-approval-offboarding",
          approvalStatus: "PENDING",
          executionStatus: null,
          summary: "Aprovação solicitada para iniciar o offboarding de Pedro Lima."
        }
      }
    }
  });

  await prisma.agentRun.upsert({
    where: { id: "seed-agent-run-task-success" },
    update: {
      organizationId: organization.id,
      startedByUserId: admin.id,
      chatThreadId: "seed-chat-thread-ops",
      mode: AgentRunMode.CHAT_ASSISTED,
      goal: "Criar uma people task de follow-up para onboarding.",
      actionType: "create_people_task",
      actionPayload: {
        title: "Follow-up de onboarding com Ana Costa",
        relatedEmployeeId: hiredEmployee.id
      },
      status: AgentRunStatus.SUCCEEDED,
      riskLevel: AgentRiskLevel.LOW,
      requiresApproval: false,
      summary: "People task criada via agente corporativo.",
      completedAt: new Date("2026-03-19T12:15:00.000Z")
    },
    create: {
      id: "seed-agent-run-task-success",
      organizationId: organization.id,
      startedByUserId: admin.id,
      chatThreadId: "seed-chat-thread-ops",
      mode: AgentRunMode.CHAT_ASSISTED,
      goal: "Criar uma people task de follow-up para onboarding.",
      actionType: "create_people_task",
      actionPayload: {
        title: "Follow-up de onboarding com Ana Costa",
        relatedEmployeeId: hiredEmployee.id
      },
      status: AgentRunStatus.SUCCEEDED,
      riskLevel: AgentRiskLevel.LOW,
      requiresApproval: false,
      summary: "People task criada via agente corporativo.",
      completedAt: new Date("2026-03-19T12:15:00.000Z")
    }
  });

  await prisma.agentActionExecution.upsert({
    where: { id: "seed-agent-execution-task-success" },
    update: {
      organizationId: organization.id,
      agentRunId: "seed-agent-run-task-success",
      executedByUserId: admin.id,
      actionType: "create_people_task",
      targetType: "people_task",
      targetId: "seed-task-manager-checkin",
      status: AgentExecutionStatus.SUCCEEDED,
      inputPayload: {
        title: "Follow-up de onboarding com Ana Costa",
        relatedEmployeeId: hiredEmployee.id
      },
      resultPayload: {
        taskId: "seed-task-manager-checkin"
      }
    },
    create: {
      id: "seed-agent-execution-task-success",
      organizationId: organization.id,
      agentRunId: "seed-agent-run-task-success",
      executedByUserId: admin.id,
      actionType: "create_people_task",
      targetType: "people_task",
      targetId: "seed-task-manager-checkin",
      status: AgentExecutionStatus.SUCCEEDED,
      inputPayload: {
        title: "Follow-up de onboarding com Ana Costa",
        relatedEmployeeId: hiredEmployee.id
      },
      resultPayload: {
        taskId: "seed-task-manager-checkin"
      }
    }
  });

  await prisma.auditEvent.upsert({
    where: {
      id: "seed-audit-invite-created"
    },
    update: {},
    create: {
      id: "seed-audit-invite-created",
      organizationId: organization.id,
      actorId: admin.id,
      action: "organization.invite_created",
      entityType: "organization_invite",
      entityId: "seed-team-invite-product",
      summary: "Convite criado para team.member@example.com com papel RECRUITER.",
      metadata: {
        email: "team.member@example.com",
        role: UserRole.RECRUITER
      }
    }
  });

  const templates = [
    {
      type: EmailTemplateType.APPLICATION_RECEIVED,
      name: "Candidatura recebida",
      subject: "Recebemos sua candidatura para {{job_title}}",
      bodyHtml:
        "<p>Oi {{candidate_name}},</p><p>Recebemos sua candidatura para <strong>{{job_title}}</strong> e nosso time vai revisar seu perfil em breve.</p>",
      bodyText:
        "Oi {{candidate_name}}, recebemos sua candidatura para {{job_title}} e nosso time vai revisar seu perfil em breve."
    },
    {
      type: EmailTemplateType.STAGE_ADVANCED,
      name: "Avanco de etapa",
      subject: "Você avancou no processo para {{job_title}}",
      bodyHtml:
        "<p>Oi {{candidate_name}},</p><p>Seu perfil avancou para a próxima etapa da vaga <strong>{{job_title}}</strong>. Em breve compartilharemos os próximos passos.</p>",
      bodyText:
        "Oi {{candidate_name}}, seu perfil avancou para a próxima etapa da vaga {{job_title}}. Em breve compartilharemos os próximos passos."
    },
    {
      type: EmailTemplateType.REJECTION,
      name: "Reprovacao",
      subject: "Atualizacao do processo para {{job_title}}",
      bodyHtml:
        "<p>Oi {{candidate_name}},</p><p>Agradecemos seu interesse. Neste momento, seguimos com outros perfis para a vaga <strong>{{job_title}}</strong>.</p>",
      bodyText:
        "Oi {{candidate_name}}, agradecemos seu interesse. Neste momento seguimos com outros perfis para a vaga {{job_title}}."
    }
  ];

  for (const template of templates) {
    await prisma.emailTemplate.upsert({
      where: {
        organizationId_type: {
          organizationId: organization.id,
          type: template.type
        }
      },
      update: template,
      create: {
        organizationId: organization.id,
        ...template
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
