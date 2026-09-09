import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getResendClient, EMAIL_FROM } from "@/lib/resend";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutos

function hashCode(email: string, code: string) {
  return crypto.createHash("sha256").update(`${email.toLowerCase()}.${code}`).digest("hex");
}

/** Gera um código de 6 dígitos, guarda o hash em VerificationToken e envia por e-mail via Resend. */
export async function requestLoginCode(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const code = crypto.randomInt(100000, 1000000).toString();

  await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
  await prisma.verificationToken.create({
    data: {
      identifier: normalizedEmail,
      token: hashCode(normalizedEmail, code),
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

  const valid = record.token === hashCode(normalizedEmail, code);
  if (valid) {
    await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
  }
  return valid;
}
