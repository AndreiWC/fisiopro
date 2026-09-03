import { Logo } from "@/components/brand/logo";

export function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <Logo iconClassName="h-6 w-6" wordmarkClassName="text-base" />
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Encaixa — desenvolvido por Fortwo
          Tecnologia
        </p>
      </div>
    </footer>
  );
}
