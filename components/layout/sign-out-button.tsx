import { LogOut } from "lucide-react";

import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  async function handleSignOut() {
    "use server";

    await signOut({
      redirectTo: "/login"
    });
  }

  return (
    <form action={handleSignOut}>
      <Button type="submit" variant="ghost" className="w-full justify-between rounded-2xl">
        Sair
        <LogOut className="h-4 w-4" />
      </Button>
    </form>
  );
}
