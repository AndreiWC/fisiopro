import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { buildOAuthState } from "@/lib/patient-google-oauth";

const STATE_COOKIE = "encaixa_patient_oauth_state";

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/perfil";
  const nonce = crypto.randomBytes(16).toString("hex");
  const state = buildOAuthState(nonce, next);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const redirectUri = `${baseUrl}/api/patient-auth/google/callback`;

  const params = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
  response.cookies.set(STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
