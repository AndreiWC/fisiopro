import { Resend } from "resend";

let client: Resend | null = null;

/** Só cria o cliente quando existe API key — o construtor do SDK lança se receber undefined. */
export function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || "Encaixa <onboarding@resend.dev>";
