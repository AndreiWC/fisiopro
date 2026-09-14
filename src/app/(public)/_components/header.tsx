"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LogIn, Menu, SettingsIcon, UserStar } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { getHeaderIdentity, type HeaderIdentity } from "../_actions/get-header-identity";

function patientInitials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Header() {
  const [isOpen, seIsOpen] = useState(false);
  const [identity, setIdentity] = useState<HeaderIdentity | null>(null);
  const pathname = usePathname();
  const isProfessionalsPage = pathname === "/profissionais";

  useEffect(() => {
    getHeaderIdentity().then(setIdentity);
  }, []);

  const navItems = isProfessionalsPage
    ? [{ href: "/", label: "Buscar profissional" }]
    : [{ href: "/profissionais", label: "Sou profissional" }];

  const NavLinks = () => (
    <>
      {navItems.map((item) => (
        <Button
          onClick={() => seIsOpen(false)}
          key={item.href}
          asChild
          variant="ghost"
        >
          <Link href={item.href} className="text-base">
            {item.label}
          </Link>
        </Button>
      ))}

      {identity === null ? (
        <></>
      ) : identity.role === "clinic" ? (
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-1.5 rounded-md px-4 text-sm font-medium hover:bg-primary/90"
        >
          Acessar meu painel
        </Link>
      ) : identity.role === "patient" ? (
        <Link
          href="/perfil"
          onClick={() => seIsOpen(false)}
          className="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          {identity.image ? (
            <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full">
              <Image src={identity.image} alt="" fill sizes="28px" className="object-cover" />
            </span>
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {patientInitials(identity.name)}
            </span>
          )}
          {identity.name?.split(" ")[0] ?? "Meu perfil"}
        </Link>
      ) : (
        <Button asChild onClick={() => seIsOpen(false)}>
          <Link href="/login">
            <LogIn />
            Fazer login
          </Link>
        </Button>
      )}
    </>
  );

  return (
    <header className="fixed to-0% right-0 left-0 z-[999] py-4 px-6 bg-background/90 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto flex items-center justify-between">
        <Link href={identity?.role === "clinic" ? "/dashboard" : "/"}>
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center space-x-4">
          <NavLinks />
        </nav>

        <Sheet open={isOpen} onOpenChange={seIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className="w-[240px] sm:w-[300px] z-[9999] p-6"
          >
            <SheetTitle>Menu</SheetTitle>
            <SheetHeader></SheetHeader>

            <SheetDescription>Veja nossos links</SheetDescription>

            <nav className="flex flex-col space-y-4 mt-6">
              <NavLinks />
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
