import { redirect } from "next/navigation";
import getSession from "@/lib/getSession";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

/** Usado em páginas/layouts do (admin): redireciona para "/" se a sessão não for de um admin. */
export async function requireAdminSession() {
  const session = await getSession();
  if (!isAdminEmail(session?.user?.email)) {
    redirect("/");
  }
  return session;
}
