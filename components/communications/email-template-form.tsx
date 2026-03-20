import { EmailTemplateType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

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

export function EmailTemplateForm({ action, template }: EmailTemplateFormProps) {
  return (
    <form action={action} className="space-y-5 rounded-[1.5rem] border border-border/70 bg-white/70 p-6 backdrop-blur">
      <input type="hidden" name="type" value={template.type} />
      <div className="space-y-1">
        <p className="section-intro">{template.type}</p>
        <Input name="name" defaultValue={template.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${template.id}-subject`}>Assunto</Label>
        <Input id={`${template.id}-subject`} name="subject" defaultValue={template.subject} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${template.id}-text`}>Corpo em texto</Label>
        <Textarea id={`${template.id}-text`} name="bodyText" defaultValue={template.bodyText} className="min-h-32" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${template.id}-html`}>Corpo HTML</Label>
        <Textarea id={`${template.id}-html`} name="bodyHtml" defaultValue={template.bodyHtml} className="min-h-40" />
      </div>
      <Button type="submit">Salvar template</Button>
    </form>
  );
}
