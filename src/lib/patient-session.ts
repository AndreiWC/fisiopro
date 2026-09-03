import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "encaixa_patient_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET não configurado");
  return secret;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function buildValue(patientId: string, email: string) {
  const expires = Date.now() + SESSION_TTL_MS;
  const emailB64 = Buffer.from(email.toLowerCase()).toString("base64url");
  const payload = `${patientId}.${emailB64}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

function parseValue(value: string | undefined): { id: string; email: string } | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [id, emailB64, expiresStr, signature] = parts;

  const expectedSignature = sign(`${id}.${emailB64}.${expiresStr}`);
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return null;
  }

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;

  const email = Buffer.from(emailB64, "base64url").toString("utf-8");
  return { id, email };
}

/** Lê a sessão do paciente (id + e-mail) a partir do cookie assinado, ou null. */
export async function getPatientSessionData() {
  const store = await cookies();
  return parseValue(store.get(COOKIE_NAME)?.value);
}

/** Só pode ser chamada de uma Server Action ou Route Handler (escreve cookie). */
export async function setPatientSessionCookie(patientId: string, email: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, buildValue(patientId, email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearPatientSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
