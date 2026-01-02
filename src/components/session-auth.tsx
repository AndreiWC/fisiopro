"use client";
import { SessionProvider } from "next-auth/react";

export function SessionAuhProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
