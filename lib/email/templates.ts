import { EmailTemplateType } from "@prisma/client";

type TemplateVariables = Record<string, string>;

export function renderTemplate(template: string, variables: TemplateVariables) {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, rawKey) => {
    const key = String(rawKey).trim();
    return variables[key] ?? "";
  });
}

export function getTemplateLabel(type: EmailTemplateType) {
  switch (type) {
    case EmailTemplateType.APPLICATION_RECEIVED:
      return "Candidatura recebida";
    case EmailTemplateType.STAGE_ADVANCED:
      return "Avanco de etapa";
    case EmailTemplateType.REJECTION:
      return "Reprovacao";
    default:
      return type;
  }
}
