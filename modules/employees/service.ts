import { EmployeeStatus, PeopleWorkflowKind } from "@prisma/client";

import { createAuditEvent } from "@/lib/audit/events";
import { prisma } from "@/lib/prisma/client";
import { createWorkflowRunFromTemplate } from "@/modules/people-ops/service";
import type { EmployeeFormInput } from "@/modules/employees/validators";

export async function createEmployee(input: {
  organizationId: string;
  actorId: string;
  data: EmployeeFormInput;
}) {
  const employee = await prisma.employee.create({
    data: {
      organizationId: input.organizationId,
      linkedUserId: input.data.linkedUserId ?? null,
      sourceApplicationId: input.data.sourceApplicationId ?? null,
      fullName: input.data.fullName,
      preferredName: input.data.preferredName ?? null,
      workEmail: input.data.workEmail ?? null,
      personalEmail: input.data.personalEmail ?? null,
      phone: input.data.phone ?? null,
      title: input.data.title,
      department: input.data.department,
      managerEmployeeId: input.data.managerEmployeeId ?? null,
      location: input.data.location ?? null,
      employmentType: input.data.employmentType ?? null,
      status: input.data.status,
      startDate: input.data.startDate ?? null,
      endDate: input.data.endDate ?? null,
      notes: input.data.notes ?? null
    }
  });

  await createAuditEvent({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: "employee.created",
    entityType: "employee",
    entityId: employee.id,
    summary: `Colaborador criado: ${employee.fullName}.`,
    metadata: {
      title: employee.title,
      department: employee.department,
      status: employee.status
    }
  });

  if (employee.status === EmployeeStatus.ONBOARDING || employee.status === EmployeeStatus.ACTIVE) {
    await createWorkflowRunFromTemplate({
      organizationId: input.organizationId,
      employeeId: employee.id,
      createdById: input.actorId,
      kind: PeopleWorkflowKind.ONBOARDING
    });
  }

  return employee;
}
