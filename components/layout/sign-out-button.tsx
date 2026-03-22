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
      <Button
        type="submit"
        variant="outline"
        className="w-full justify-between rounded-[1rem] border-white/[0.08] bg-white/[0.02] text-white/82 hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white"
      >
        Sair
        <LogOut className="h-4 w-4" />
      </Button>
    </form>
  );
}
