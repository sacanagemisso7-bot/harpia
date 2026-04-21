import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrganizationSettingsFormProps = {
  action: (formData: FormData) => Promise<void>;
  defaultValues: {
    name: string;
    slug: string;
    sizeRange: string | null;
  };
};

export function OrganizationSettingsForm({ action, defaultValues }: OrganizationSettingsFormProps) {
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nome da organização</Label>
        <Input id="name" name="name" defaultValue={defaultValues.name} />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="slug">Endereço interno</Label>
          <Input id="slug" name="slug" defaultValue={defaultValues.slug} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sizeRange">Faixa de tamanho</Label>
          <Input id="sizeRange" name="sizeRange" defaultValue={defaultValues.sizeRange ?? ""} placeholder="Ex.: 51-200" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">Salvar configurações</Button>
      </div>
    </form>
  );
}
