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
    <form action={action} className="workspace-form workspace-form-section h-full">
      <input type="hidden" name="type" value={template.type} />
      <div className="workspace-form-copy">
        <p className="section-intro">{template.type}</p>
        <Label htmlFor={`${template.id}-name`}>Nome interno</Label>
        <Input id={`${template.id}-name`} name="name" defaultValue={template.name} />
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
      <div className="workspace-form-actions">
        <Button type="submit">Salvar template</Button>
      </div>
    </form>
  );
}
