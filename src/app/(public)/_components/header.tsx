"use client";
import { useState } from "react";
import Link from "next/link";
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
import Image from "next/image";
import { useSession } from "next-auth/react";
import { handleRegister } from "../_actions/login";
import logoimg from "../../../../public/logo2.png";

export function Header() {
  const { data: session, status } = useSession();
  const [isOpen, seIsOpen] = useState(false);

  const navItems = [{ href: "#profissionais", label: "Profissionais" }];
  async function handleLogin() {
    await handleRegister("github");
  }

  const NavLinks = () => (
    <>
      {navItems.map((item) => (
        <Button
          onClick={() => seIsOpen(false)}
          key={item.href}
          asChild
          className="bg-transparent hover:bg-transparent text-black shadow-none"
        >
          <Link href={item.href} className="text-base">
            {item.label}
          </Link>
        </Button>
      ))}

      {status === "loading" ? (
        <></>
      ) : session ? (
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 bg-zinc-900 text-white py-1 rounded-md px-4"
        >
          Painel da Clínica
        </Link>
      ) : (
        <Button onClick={handleLogin}>
          <LogIn />
          Fazer Login
        </Button>
      )}
    </>
  );

  return (
    <header className="fixed to-0% right-0 left-0 z-[999] py-4 px-6 bg-white">
      <div className="container mx-auto flex items-center justify-between">
        {/* <Link href="/" className="text-3xl font-bold text-zinc-900">
          Fisio
          <span className="text-3xl font-bold text-blue-500">Pro</span>
        </Link> */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src={logoimg}
            alt="FisioPro"
            width={140} // ajuste conforme o tamanho da sua logo
            height={50} // idem
            priority
          />
        </Link>
        <nav className="hidden md:flex items-center space-x-4">
          <NavLinks />
        </nav>

        <Sheet open={isOpen} onOpenChange={seIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button
              className="text-black hover:bg-transparent"
              variant="ghost"
              size="icon"
            >
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
