import { EmailTemplateType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type EmailTemplateFormProps = {
  action: (formData: FormData) => Promise<void>;
  template: {
    id: string;
    type: EmailTemplateType;
    name: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
  };
};

function formatTemplateType(type: EmailTemplateType) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function EmailTemplateForm({ action, template }: EmailTemplateFormProps) {
  return (
    <form action={action} className="grid gap-4 border border-border/85 bg-card p-4">
      <input type="hidden" name="type" value={template.type} />

      <div className="grid gap-1.5">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {formatTemplateType(template.type)}
        </p>
        <p className="text-sm text-muted-foreground">Edite o conteúdo mantendo assunto, texto e HTML alinhados.</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${template.id}-name`}>Nome interno</Label>
        <Input id={`${template.id}-name`} name="name" defaultValue={template.name} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${template.id}-subject`}>Assunto</Label>
        <Input id={`${template.id}-subject`} name="subject" defaultValue={template.subject} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${template.id}-text`}>Corpo em texto</Label>
        <Textarea id={`${template.id}-text`} name="bodyText" defaultValue={template.bodyText} className="min-h-32" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${template.id}-html`}>Corpo HTML</Label>
        <Textarea id={`${template.id}-html`} name="bodyHtml" defaultValue={template.bodyHtml} className="min-h-40" />
      </div>

      <div className="flex items-center justify-end">
        <Button type="submit">Salvar template</Button>
      </div>
    </form>
  );
}
