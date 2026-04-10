import { LogOut } from "lucide-react";

import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className }: SignOutButtonProps) {
  async function handleSignOut() {
    "use server";

    await signOut({
      redirectTo: "/login"
    });
  }

  return (
    <form action={handleSignOut}>
      <Button type="submit" variant="outline" className={cn("w-full justify-between rounded-[1rem]", className)}>
        Sair
        <LogOut className="h-4 w-4" />
      </Button>
    </form>
  );
}
