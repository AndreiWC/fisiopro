import crypto from "crypto";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET não configurado");
  return secret;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/perfil";
}

/** Codifica o destino pós-login dentro do próprio `state` do OAuth, assinado. */
export function buildOAuthState(nonce: string, next: string) {
  const payload = `${nonce}.${Buffer.from(safeNext(next)).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

export function parseOAuthState(state: string | null): { nonce: string; next: string } | null {
  if (!state) return null;
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [nonce, nextB64, signature] = parts;

  const expected = sign(`${nonce}.${nextB64}`);
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  const next = Buffer.from(nextB64, "base64url").toString("utf-8");
  return { nonce, next: safeNext(next) };
}
