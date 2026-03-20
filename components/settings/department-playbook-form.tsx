import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type DepartmentPlaybookFormProps = {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    id: string;
    department: string;
    title: string;
    screeningGuidance: string;
    interviewGuidance: string;
    decisionGuidance: string;
    strongSignals: string[];
    riskSignals: string[];
  };
  submitLabel: string;
};

export function DepartmentPlaybookForm({ action, defaultValues, submitLabel }: DepartmentPlaybookFormProps) {
  return (
    <form action={action} className="space-y-4">
      {defaultValues?.id ? <input type="hidden" name="playbookId" value={defaultValues.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`department-${defaultValues?.id ?? "new"}`}>Departamento</Label>
          <Input
            id={`department-${defaultValues?.id ?? "new"}`}
            name="department"
            defaultValue={defaultValues?.department}
            placeholder="Ex.: Product & Engineering"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`title-${defaultValues?.id ?? "new"}`}>Titulo do playbook</Label>
          <Input
            id={`title-${defaultValues?.id ?? "new"}`}
            name="title"
            defaultValue={defaultValues?.title}
            placeholder="Ex.: Contratacao de product engineers"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`screeningGuidance-${defaultValues?.id ?? "new"}`}>Guia de triagem</Label>
        <Textarea
          id={`screeningGuidance-${defaultValues?.id ?? "new"}`}
          name="screeningGuidance"
          className="min-h-24"
          defaultValue={defaultValues?.screeningGuidance}
          placeholder="O que priorizar na leitura inicial, quais sinais puxam a vaga para cima e o que precisa de validacao cedo."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`interviewGuidance-${defaultValues?.id ?? "new"}`}>Guia de entrevista</Label>
        <Textarea
          id={`interviewGuidance-${defaultValues?.id ?? "new"}`}
          name="interviewGuidance"
          className="min-h-24"
          defaultValue={defaultValues?.interviewGuidance}
          placeholder="Que perguntas, profundidade e foco usar nas entrevistas desse departamento."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`decisionGuidance-${defaultValues?.id ?? "new"}`}>Guia de decisao</Label>
        <Textarea
          id={`decisionGuidance-${defaultValues?.id ?? "new"}`}
          name="decisionGuidance"
          className="min-h-24"
          defaultValue={defaultValues?.decisionGuidance}
          placeholder="Como decidir entre avancar, segurar ou encerrar com base nos sinais desse departamento."
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`strongSignals-${defaultValues?.id ?? "new"}`}>Sinais fortes</Label>
          <Textarea
            id={`strongSignals-${defaultValues?.id ?? "new"}`}
            name="strongSignals"
            className="min-h-24"
            defaultValue={defaultValues?.strongSignals.join("\n")}
            placeholder="Um sinal por linha"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`riskSignals-${defaultValues?.id ?? "new"}`}>Sinais de risco</Label>
          <Textarea
            id={`riskSignals-${defaultValues?.id ?? "new"}`}
            name="riskSignals"
            className="min-h-24"
            defaultValue={defaultValues?.riskSignals.join("\n")}
            placeholder="Um risco por linha"
          />
        </div>
      </div>
      <Button type="submit" variant={defaultValues ? "outline" : "default"}>
        {submitLabel}
      </Button>
    </form>
  );
}
