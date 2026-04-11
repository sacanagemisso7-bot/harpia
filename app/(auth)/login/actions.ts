"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import type { LoginFormState } from "@/components/auth/login-form";
import { normalizeCallbackPath } from "@/lib/auth/callback-url";
import { signInSchema } from "@/lib/validations/auth";

export async function authenticate(
  _previousState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Não foi possível validar suas credenciais."
    };
  }

  try {
    const callbackUrl = normalizeCallbackPath(formData.get("callbackUrl")?.toString());

    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl
    });

    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "Email ou senha invalidos."
      };
    }

    throw error;
  }
}
