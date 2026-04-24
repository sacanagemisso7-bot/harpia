"use client";

import { CandidateSource } from "@prisma/client";

import { AssistedCreateBox } from "@/components/ai/assisted-create-box";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CandidateFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  defaultValues?: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    linkedinUrl?: string | null;
    portfolioUrl?: string | null;
    location?: string | null;
    summary?: string | null;
    yearsExperience?: number | null;
    highestEducation?: string | null;
    currentTitle?: string | null;
    currentCompany?: string | null;
    source: CandidateSource;
  };
};

export function CandidateForm({ action, submitLabel, defaultValues }: CandidateFormProps) {
  return (
    <form action={action} className="workspace-form">
      {!defaultValues ? (
        <AssistedCreateBox
          mode="candidate"
          fieldNames={{
            title: "fullName",
            description: "summary"
          }}
        />
      ) : null}
      <div className="workspace-form-grid">
        <div className="space-y-2 workspace-form-span-full">
          <Label htmlFor="fullName">Nome completo</Label>
          <Input id="fullName" name="fullName" defaultValue={defaultValues?.fullName} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" name="phone" defaultValue={defaultValues?.phone ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentTitle">Cargo atual</Label>
          <Input id="currentTitle" name="currentTitle" defaultValue={defaultValues?.currentTitle ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentCompany">Empresa atual</Label>
          <Input id="currentCompany" name="currentCompany" defaultValue={defaultValues?.currentCompany ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Localização</Label>
          <Input id="location" name="location" defaultValue={defaultValues?.location ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="yearsExperience">Anos de experiência</Label>
          <Input
            id="yearsExperience"
            name="yearsExperience"
            type="number"
            min={0}
            step="0.5"
            defaultValue={defaultValues?.yearsExperience ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="highestEducation">Formação</Label>
          <Input
            id="highestEducation"
            name="highestEducation"
            defaultValue={defaultValues?.highestEducation ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">Origem</Label>
          <Select id="source" name="source" defaultValue={defaultValues?.source ?? CandidateSource.MANUAL_IMPORT}>
            <option value={CandidateSource.MANUAL_IMPORT}>Importação manual</option>
            <option value={CandidateSource.LINKEDIN}>LinkedIn</option>
            <option value={CandidateSource.REFERRAL}>Indicação</option>
            <option value={CandidateSource.CAREERS_PAGE}>Página de carreiras</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="linkedinUrl">LinkedIn</Label>
          <Input
            id="linkedinUrl"
            name="linkedinUrl"
            type="url"
            defaultValue={defaultValues?.linkedinUrl ?? ""}
          />
        </div>
        <div className="space-y-2 workspace-form-span-full">
          <Label htmlFor="portfolioUrl">Portfolio / site pessoal</Label>
          <Input
            id="portfolioUrl"
            name="portfolioUrl"
            type="url"
            defaultValue={defaultValues?.portfolioUrl ?? ""}
          />
        </div>
        <div className="space-y-2 workspace-form-span-full">
          <Label htmlFor="summary">Resumo</Label>
          <Textarea
            id="summary"
            name="summary"
            defaultValue={defaultValues?.summary ?? ""}
            placeholder="Resumo profissional, pontos fortes e contexto do perfil."
          />
        </div>
      </div>
      <div className="workspace-form-actions justify-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
