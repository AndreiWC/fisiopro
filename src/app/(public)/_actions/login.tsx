"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { requestLoginCode } from "@/lib/patient-otp";

type LoginType = "google" | "github";

function loginRedirect(next?: string) {
  return next && next.startsWith("/") ? `/login?next=${encodeURIComponent(next)}` : "/login";
}

export async function handleRegister(provider: LoginType, next?: string) {
  await signIn(provider, { redirectTo: loginRedirect(next) });
}

export async function sendLoginCode(email: string) {
  try {
    await requestLoginCode(email);
    return { data: "Código enviado! Confira seu e-mail." };
  } catch {
    return { error: "Não foi possível enviar o código agora. Tente novamente." };
  }
}

export async function confirmLoginCode(email: string, code: string, next?: string) {
  try {
    await signIn("email-code", { email, code, redirect: false });
  } catch {
    return { error: "Código inválido ou expirado." };
  }
  // redirect() fora do try/catch: seu throw interno não pode ser tratado como erro.
  redirect(loginRedirect(next));
}
