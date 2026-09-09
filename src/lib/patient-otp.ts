import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getResendClient, EMAIL_FROM } from "@/lib/resend";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutos
const OTP_REQUEST_COOLDOWN_MS = 60 * 1000; // 60 segundos entre pedidos de código
const OTP_MAX_ATTEMPTS = 5;

function hashCode(email: string, code: string) {
  return crypto.createHash("sha256").update(`${email.toLowerCase()}.${code}`).digest("hex");
}

// O modelo VerificationToken (do adapter do NextAuth) só tem { identifier, token, expires } —
// não há coluna para "tentativas restantes" nem para "criado em", e adicionar colunas está fora
// do escopo desta correção. Por isso o contador de tentativas é embutido no próprio `token`,
// como `${hash}.${attemptsUsados}` (ex.: "ab12...ef.2" após 2 tentativas erradas). O "criado em"
// é derivado de `expires - OTP_TTL_MS`, já que sempre gravamos `expires = now + OTP_TTL_MS`.
function encodeToken(hash: string, attempts: number) {
  return `${hash}.${attempts}`;
}

function decodeToken(stored: string): { hash: string; attempts: number } {
  const separatorIndex = stored.lastIndexOf(".");
  if (separatorIndex === -1) {
    // Tokens antigos (pré-rate-limit) não têm o sufixo — trata como 0 tentativas usadas.
    return { hash: stored, attempts: 0 };
  }
  const attempts = Number(stored.slice(separatorIndex + 1));
  return {
    hash: stored.slice(0, separatorIndex),
    attempts: Number.isFinite(attempts) ? attempts : 0,
  };
}

/** Gera um código de 6 dígitos, guarda o hash em VerificationToken e envia por e-mail via Resend. */
export async function requestLoginCode(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.verificationToken.findFirst({
    where: { identifier: normalizedEmail },
  });
  if (existing) {
    const createdAt = existing.expires.getTime() - OTP_TTL_MS;
    const elapsedSinceCreation = Date.now() - createdAt;
    if (existing.expires > new Date() && elapsedSinceCreation < OTP_REQUEST_COOLDOWN_MS) {
      throw new Error("Aguarde um pouco antes de solicitar um novo código.");
    }
  }

  const code = crypto.randomInt(100000, 1000000).toString();

  await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
  await prisma.verificationToken.create({
    data: {
      identifier: normalizedEmail,
      token: encodeToken(hashCode(normalizedEmail, code), 0),
      expires: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  const resend = getResendClient();
  if (!resend) {
    throw new Error("RESEND_API_KEY não configurado — não é possível enviar o código");
  }

  await resend.emails.send({
    from: EMAIL_FROM,
    to: normalizedEmail,
    subject: "Seu código de acesso à Encaixa",
    text: `Seu código de acesso é ${code}. Ele expira em 10 minutos.`,
  });
}

/** Confere o código contra o hash salvo; se válido, consome o token (não pode ser reusado). */
export async function verifyLoginCode(email: string, code: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const record = await prisma.verificationToken.findFirst({
    where: { identifier: normalizedEmail },
  });

  if (!record || record.expires < new Date()) {
    return false;
  }

  const { hash, attempts } = decodeToken(record.token);
  const valid = hash === hashCode(normalizedEmail, code);

  if (valid) {
    await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
    return true;
  }

  const attemptsUsed = attempts + 1;
  if (attemptsUsed >= OTP_MAX_ATTEMPTS) {
    // Esgotou as tentativas: invalida o token — nem o código certo funciona mais depois disso.
    await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
  } else {
    await prisma.verificationToken.update({
      where: { identifier_token: { identifier: normalizedEmail, token: record.token } },
      data: { token: encodeToken(hash, attemptsUsed) },
    });
  }
  return false;
}
