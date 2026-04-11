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

export function OrganizationSettingsForm({
  action,
  defaultValues
}: OrganizationSettingsFormProps) {
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da organização</Label>
        <Input id="name" name="name" defaultValue={defaultValues.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={defaultValues.slug} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sizeRange">Faixa de tamanho</Label>
        <Input id="sizeRange" name="sizeRange" defaultValue={defaultValues.sizeRange ?? ""} />
      </div>
      <Button type="submit">Salvar configurações</Button>
    </form>
  );
}
