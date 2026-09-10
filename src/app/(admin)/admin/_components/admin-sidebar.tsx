"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import clsx from "clsx";
import { Building2, LayoutDashboard, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/empresas", label: "Empresas", icon: Building2 },
] as const;

export function AdminSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen w-full">
      <aside className="fixed hidden h-full w-64 flex-col border-r border-border bg-background p-4 md:flex">
        <div className="mb-6 mt-4">
          <Link href="/admin">
            <Logo />
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          <span className="mt-1 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Administração
          </span>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col md:ml-64">
        <main className="flex-1 px-4 py-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
