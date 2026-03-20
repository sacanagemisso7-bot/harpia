import { UserRole } from "@prisma/client";
import { z } from "zod";

export const inviteTeamMemberSchema = z.object({
  email: z.string().email("Informe um email valido."),
  role: z.nativeEnum(UserRole),
  message: z.string().max(500, "Use no maximo 500 caracteres.").optional()
});

export const updateTeamMemberRoleSchema = z.object({
  role: z.nativeEnum(UserRole)
});

export const acceptInviteSchema = z.object({
  name: z.string().min(2, "Informe seu nome."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.")
});

export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;
export type UpdateTeamMemberRoleInput = z.infer<typeof updateTeamMemberRoleSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
