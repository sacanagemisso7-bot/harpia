import { HarpiaLayout } from "@/components/dashboard/system/harpia-layout";
import type { DashboardData } from "@/components/dashboard/system/dashboard-model";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

function getFastDashboard(): DashboardData {
  return {
    metrics: {
      employees: 1247,
      onboardingActive: 36,
      offboardingActive: 8,
      openRequests: 17,
      overdueTasks: 3,
      pendingCompliance: 24,
      eventsToday: 21,
      requestsAtRisk: 4
    },
    alerts: [
      {
        type: "workspace",
        title: "4 solicitações pedem decisão",
        description: "Benefícios, férias e documentos estão próximos do SLA.",
        href: "/requests",
        severity: "high"
      },
      {
        type: "ai",
        title: "IA preparou 6 ações seguras",
        description: "Respostas, tarefas e follow-ups aguardam revisão rápida.",
        href: "/chat",
        severity: "medium"
      },
      {
        type: "people",
        title: "Onboarding com gargalo",
        description: "Três admissões precisam de documentação antes de sexta.",
        href: "/people/onboarding",
        severity: "medium"
      }
    ],
    requests: [
      {
        id: "demo-request-benefits",
        title: "Atualizar dependente no benefício",
        status: "OPEN",
        effectiveSlaStatus: "AT_RISK",
        assigneeUser: { name: "Marina Alves" }
      },
      {
        id: "demo-request-document",
        title: "Emitir carta de vínculo",
        status: "WAITING_ON_ASSIGNEE",
        effectiveSlaStatus: "BREACHED",
        assigneeUser: null
      }
    ],
    overdueTasks: [
      {
        id: "demo-task-access",
        title: "Revisar acessos de offboarding",
        status: "BLOCKED",
        isOverdue: true,
        relatedEmployee: { fullName: "Pedro Lima", title: "Account Executive" },
        assigneeUser: { name: "Ana Costa" }
      }
    ],
    onboarding: [
      {
        id: "demo-onboarding-1",
        employee: { fullName: "Bianca Torres", title: "Product Designer" },
        steps: [{ status: "DONE" }, { status: "DONE" }, { status: "PENDING" }, { status: "PENDING" }]
      },
      {
        id: "demo-onboarding-2",
        employee: { fullName: "Rafael Nunes", title: "Engineering Manager" },
        steps: [{ status: "DONE" }, { status: "PENDING" }, { status: "PENDING" }]
      }
    ],
    offboarding: [
      {
        id: "demo-offboarding-1",
        employee: { fullName: "Pedro Lima", title: "Account Executive" },
        steps: [{ status: "DONE" }, { status: "PENDING" }, { status: "PENDING" }]
      }
    ],
    compliance: [
      {
        id: "demo-compliance-lgpd",
        title: "Aceite de política LGPD",
        employee: { fullName: "Lívia Rocha" },
        dueAt: new Date("2026-04-24T12:00:00-03:00")
      },
      {
        id: "demo-compliance-security",
        title: "Treinamento de segurança",
        employee: { fullName: "Marina Alves" },
        dueAt: new Date("2026-04-25T12:00:00-03:00")
      }
    ],
    events: [
      {
        id: "demo-event-review",
        title: "Revisão de onboarding",
        startsAt: new Date("2026-04-22T15:00:00-03:00"),
        relatedEmployee: { id: "demo-employee-bianca", fullName: "Bianca Torres", title: "Product Designer" }
      },
      {
        id: "demo-event-calibration",
        title: "Calibração de gestores",
        startsAt: new Date("2026-04-22T17:30:00-03:00"),
        relatedEmployee: null
      }
    ],
    hiring: {
      jobCount: 12,
      applicationCount: 248,
      slaAlerts: 3,
      intelligenceHighlights: [
        {
          id: "demo-app-ana",
          candidateName: "Ana Costa",
          jobTitle: "People Ops Lead",
          score: 91,
          stageName: "Entrevista final",
          href: "/applications/demo-app-ana"
        },
        {
          id: "demo-app-joao",
          candidateName: "João Martins",
          jobTitle: "HR Business Partner",
          score: 84,
          stageName: "Scorecard",
          href: "/applications/demo-app-joao"
        }
      ],
      decisionNetwork: [
        {
          id: "demo-network-ana",
          candidateName: "Ana Costa",
          jobTitle: "People Ops Lead",
          score: 91,
          stageName: "Entrevista final",
          stagnantHours: 18,
          href: "/applications/demo-app-ana"
        },
        {
          id: "demo-network-joao",
          candidateName: "João Martins",
          jobTitle: "HR Business Partner",
          score: 84,
          stageName: "Scorecard",
          stagnantHours: 52,
          href: "/applications/demo-app-joao"
        }
      ]
    }
  };
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const dashboard = getFastDashboard();

  return (
    <HarpiaLayout
      data={dashboard}
      viewer={{
        name: session.user.name,
        organizationName: "Harpia Demo",
        role: String(session.user.role ?? "ADMIN")
      }}
    />
  );
}
