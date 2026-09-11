"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Banknote,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Folder,
  LogOut,
  Settings,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Agendamentos", icon: CalendarCheck2 },
  { href: "/dashboard/patients", label: "Pacientes", icon: Users },
  { href: "/dashboard/services", label: "Serviços", icon: Folder },
  { href: "/dashboard/financeiro", label: "Financeiro", icon: Wallet },
] as const;

const SETTINGS_ITEMS = [
  { href: "/dashboard/profile", label: "Meu perfil", icon: Settings },
  { href: "/dashboard/plans", label: "Planos", icon: Banknote },
] as const;

const BOTTOM_TAB_ITEMS = [
  { href: "/dashboard", label: "Agenda", icon: CalendarCheck2 },
  { href: "/dashboard/patients", label: "Pacientes", icon: Users },
  { href: "/dashboard/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/dashboard/services", label: "Serviços", icon: Folder },
  { href: "/dashboard/profile", label: "Perfil", icon: Settings },
] as const;

function initials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function SidebarDashboard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen w-full">
      <aside
        className={clsx(
          "hidden md:flex md:fixed h-full flex-col border-r border-border bg-background p-4 transition-all duration-300",
          {
            "w-20": isCollapsed,
            "w-64": !isCollapsed,
          },
        )}
      >
        <div className="mb-6 mt-4 flex items-center justify-between">
          {!isCollapsed && (
            <Link href="/dashboard">
              <Logo />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={clsx("shrink-0 text-muted-foreground", isCollapsed && "mx-auto")}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {!isCollapsed ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-hidden">
          {!isCollapsed && (
            <span className="mt-1 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Painel
            </span>
          )}
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.href} {...item} pathname={pathname} isCollapsed={isCollapsed} />
          ))}

          {!isCollapsed && (
            <span className="mt-4 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Configurações
            </span>
          )}
          {isCollapsed && <div className="my-2 border-t border-border" />}
          {SETTINGS_ITEMS.map((item) => (
            <SidebarLink key={item.href} {...item} pathname={pathname} isCollapsed={isCollapsed} />
          ))}
        </nav>

        <div className="mt-2 border-t border-border pt-3">
          <div className={clsx("flex items-center gap-2.5", isCollapsed && "justify-center")}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {session?.user?.name ? initials(session.user.name) : "?"}
            </span>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {session?.user?.name ?? "Minha conta"}
                </p>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
                >
                  <LogOut className="h-3 w-3" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div
        className={clsx("flex flex-1 flex-col pb-16 transition-all duration-300 md:pb-0", {
          "md:ml-20": isCollapsed,
          "md:ml-64": !isCollapsed,
        })}
      >
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
          <Link href="/dashboard">
            <Logo iconClassName="h-6 w-6" wordmarkClassName="text-base" />
          </Link>
          <Link
            href="/dashboard/profile"
            aria-label="Meu perfil"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <UserCircle className="h-5 w-5" />
          </Link>
        </header>

        <main className="flex-1 px-2 py-4 md:p-6">{children}</main>
      </div>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
      >
        <div className="flex items-stretch">
          {BOTTOM_TAB_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[11px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

interface SidebarLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  pathname: string;
  isCollapsed: boolean;
}

function SidebarLink({ href, icon: Icon, isCollapsed, label, pathname }: SidebarLinkProps) {
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      title={isCollapsed ? label : undefined}
      className={clsx(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        isCollapsed && "justify-center",
        isActive
          ? "bg-primary/10 font-medium text-primary"
          : "text-foreground/70 hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && <span>{label}</span>}
    </Link>
  );
}
