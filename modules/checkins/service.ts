import type { EmployeeCheckInInput } from "@/modules/checkins/validators";
import { createAuditEvent } from "@/lib/audit/events";
import { prisma } from "@/lib/prisma/client";

export async function createEmployeeCheckIn(input: {
  organizationId: string;
  actorId: string;
  data: EmployeeCheckInInput;
}) {
  const employee = await prisma.employee.findFirst({
    where: {
      id: input.data.employeeId,
      organizationId: input.organizationId
    }
  });

  if (!employee) {
    throw new Error("Colaborador nao encontrado.");
  }

  const checkIn = await prisma.employeeCheckIn.create({
    data: {
      organizationId: input.organizationId,
      employeeId: employee.id,
      authorId: input.actorId,
      type: input.data.type,
      title: input.data.title,
      summary: input.data.summary ?? null,
      followUpAt: input.data.followUpAt ?? null
    }
  });

  await createAuditEvent({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: "employee_checkin.created",
    entityType: "employee",
    entityId: employee.id,
    summary: `Registro ${checkIn.type.toLowerCase()} adicionado para ${employee.fullName}.`,
    metadata: {
      checkInId: checkIn.id,
      type: checkIn.type
    }
  });

  return checkIn;
}
