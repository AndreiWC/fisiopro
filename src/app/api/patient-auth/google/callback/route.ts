import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { setPatientSessionCookie } from "@/lib/patient-session";
import { parseOAuthState } from "@/lib/patient-google-oauth";

const STATE_COOKIE = "encaixa_patient_oauth_state";
const CLINIC_SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token";
const CLINIC_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias, mesmo padrão do NextAuth

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const parsedState = parseOAuthState(url.searchParams.get("state"));
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const cookieNonce = request.cookies.get(STATE_COOKIE)?.value;

  if (oauthError || !code || !parsedState || !cookieNonce || parsedState.nonce !== cookieNonce) {
    return NextResponse.redirect(`${baseUrl}/login?error=google`);
  }

  const redirectUri = `${baseUrl}/api/patient-auth/google/callback`;

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(`${baseUrl}/login?error=google`);
    }

    const tokenData: { access_token?: string } = await tokenResponse.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(`${baseUrl}/login?error=google`);
    }

    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(`${baseUrl}/login?error=google`);
    }

    const profile: { email?: string; email_verified?: boolean; name?: string; picture?: string } =
      await userInfoResponse.json();

    if (!profile.email || !profile.email_verified) {
      return NextResponse.redirect(`${baseUrl}/login?error=google`);
    }

    const email = profile.email.toLowerCase();

    // Esse e-mail já é uma conta de clínica? Entra no ambiente da clínica em vez de virar paciente.
    const clinicUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (clinicUser) {
      const sessionToken = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + CLINIC_SESSION_TTL_MS);
      await prisma.session.create({
        data: { sessionToken, userId: clinicUser.id, expires },
      });

      const response = NextResponse.redirect(`${baseUrl}/dashboard`);
      response.cookies.set(CLINIC_SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        expires,
      });
      response.cookies.delete(STATE_COOKIE);
      return response;
    }

    const patient = await prisma.patient.upsert({
      where: { email },
      create: { email, name: profile.name ?? null, image: profile.picture ?? null },
      update: { name: profile.name ?? undefined, image: profile.picture ?? undefined },
    });

    await setPatientSessionCookie(patient.id, patient.email);

    const response = NextResponse.redirect(`${baseUrl}${parsedState.next}`);
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch {
    return NextResponse.redirect(`${baseUrl}/login?error=google`);
  }
}
