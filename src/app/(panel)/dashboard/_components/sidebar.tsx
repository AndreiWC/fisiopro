"use client";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { Button } from "@/components/ui/button";
import {
  Banknote,
  CalendarCheck2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Folder,
  List,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function SidebarDashboard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      <aside
        className={clsx(
          "flex flex-col border-r bg-background transition-all duration-300 p-4 h-full",
          {
            "w-20": isCollapsed,
            "w-64": !isCollapsed,
            "hidden md:flex md:fixed": true,
          }
        )}
      >
        <div className="mb-6 mt-4">
          {!isCollapsed && (
            <Link href="/">
              <Logo />
            </Link>
          )}
        </div>

        <Button
          variant="secondary"
          size="icon"
          className="self-end mb-2"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {!isCollapsed ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </Button>

        {/* Mostrar icones quando estiver recolhido */}
        {isCollapsed && (
          <nav className="flex flex-col gap-1 overflow-hidden">
            <SlidebarLink
              href="/dashboard"
              label="Agendamentos"
              pathname={pathname}
              isCollapsed={isCollapsed}
              icon={<CalendarCheck2 className="w-6 h-6" />}
            />

            <SlidebarLink
              href="/dashboard/patients"
              label="Pacientes"
              pathname={pathname}
              isCollapsed={isCollapsed}
              icon={<Users className="w-6 h-6" />}
            />

            <SlidebarLink
              href="/dashboard/services"
              label="Serviços"
              pathname={pathname}
              isCollapsed={isCollapsed}
              icon={<Folder className="w-6 h-6" />}
            />
            <SlidebarLink
              href="/dashboard/profile"
              label="Meu perfil"
              pathname={pathname}
              isCollapsed={isCollapsed}
              icon={<Settings className="w-6 h-6" />}
            />

            <SlidebarLink
              href="/dashboard/plans"
              label="Planos"
              pathname={pathname}
              isCollapsed={isCollapsed}
              icon={<Banknote className="w-6 h-6" />}
            />
          </nav>
        )}

        <Collapsible open={!isCollapsed}>
          <CollapsibleContent>
            <nav className="flex flex-col gap-1 overflow-hidden">
              <span className="text-sm text-muted-foreground font-medium mt-1 uppercase tracking-wide">
                Painel
              </span>

              <SlidebarLink
                href="/dashboard"
                label="Agendamentos"
                pathname={pathname}
                isCollapsed={isCollapsed}
                icon={<CalendarCheck2 className="w-6 h-6" />}
              />

              <SlidebarLink
                href="/dashboard/patients"
                label="Pacientes"
                pathname={pathname}
                isCollapsed={isCollapsed}
                icon={<Users className="w-6 h-6" />}
              />

              <SlidebarLink
                href="/dashboard/services"
                label="Serviços"
                pathname={pathname}
                isCollapsed={isCollapsed}
                icon={<Folder className="w-6 h-6" />}
              />

              <span className="text-sm text-muted-foreground font-medium mt-1 uppercase tracking-wide">
                Configurações
              </span>

              <SlidebarLink
                href="/dashboard/profile"
                label="Meu perfil"
                pathname={pathname}
                isCollapsed={isCollapsed}
                icon={<Settings className="w-6 h-6" />}
              />

              <SlidebarLink
                href="/dashboard/plans"
                label="Planos"
                pathname={pathname}
                isCollapsed={isCollapsed}
                icon={<Banknote className="w-6 h-6" />}
              />
            </nav>
          </CollapsibleContent>
        </Collapsible>
      </aside>
      <div
        className={clsx("flex flex-1 flex-col transition-all duration-300", {
          "md:ml-20": isCollapsed,
          "md:ml-64": !isCollapsed,
        })}
      >
        <header
          className="md:hidden flex items-center justify-between border-b border-border
                px-2 md:px-6 h-14 z-10 sticky top-0 bg-background"
        >
          <Sheet>
            <div className="flex items-center gap-4">
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setIsCollapsed(false)}
                >
                  <List className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <Link href="/">
                <Logo iconClassName="h-6 w-6" wordmarkClassName="text-base" />
              </Link>
            </div>

            <SheetContent side="right" className="sm:max-w-xs p-6">
              <SheetTitle className="text-lg font-bold leading-tight">
                <Link href="/">
                  <Logo iconClassName="h-6 w-6" wordmarkClassName="text-base" />
                </Link>
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground mb-0">
                Menu administrativo
              </SheetDescription>
              <nav className="grid gap-2 text-base">
                <SlidebarLink
                  href="/dashboard"
                  label="Agendamentos"
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                  icon={<CalendarCheck2 className="w-6 h-6" />}
                />

                <SlidebarLink
                  href="/dashboard/patients"
                  label="Pacientes"
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                  icon={<Users className="w-6 h-6" />}
                />

                <SlidebarLink
                  href="/dashboard/services"
                  label="Serviços"
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                  icon={<Folder className="w-6 h-6" />}
                />

                <SlidebarLink
                  href="/dashboard/profile"
                  label="Meu perfil"
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                  icon={<Settings className="w-6 h-6" />}
                />

                <SlidebarLink
                  href="/dashboard/plans"
                  label="Planos"
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                  icon={<Banknote className="w-6 h-6" />}
                />
              </nav>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 py-4 px-2 md:p-6">{children}</main>
      </div>
    </div>
  );
}

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  pathname: string;
  isCollapsed: boolean;
}

function SlidebarLink({
  href,
  icon,
  isCollapsed,
  label,
  pathname,
}: SidebarLinkProps) {
  return (
    <Link href={href}>
      <div
        className={clsx(
          "flex items-center gap-2  px-3 py-2 rounded-md transition-colors",
          {
            "text-primary-foreground bg-primary": pathname === href,
            "text-foreground/80 hover:bg-secondary": pathname !== href,
          }
        )}
      >
        <span className="w-6 h-6">{icon}</span>
        {!isCollapsed && <span>{label}</span>}
      </div>
    </Link>
  );
}
