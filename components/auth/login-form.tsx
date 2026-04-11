"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type LoginFormState = {
  error?: string;
};

type LoginFormProps = {
  callbackUrl?: string;
};

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const target = callbackUrl ?? "/dashboard";

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: target
    });

    if (result?.error) {
      setError("Email ou senha inválidos.");
      setPending(false);
      return;
    }

    window.location.assign(target);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="você@empresa.com" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" placeholder="Sua senha" required />
      </div>
      <FormMessage message={error} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
