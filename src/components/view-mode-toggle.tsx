"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "list" | "cards";

/** Guarda no navegador a forma de listagem escolhida em cada tela. */
export function useViewMode(storageKey: string, initial: ViewMode) {
  const [view, setView] = useState<ViewMode>(initial);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "list" || stored === "cards") setView(stored);
    } catch {
      // armazenamento indisponível: segue com o padrão
    }
  }, [storageKey]);

  function changeView(next: ViewMode) {
    setView(next);
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      // sem persistência, a escolha vale só para esta visita
    }
  }

  return [view, changeView] as const;
}

interface ViewModeToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
  className?: string;
}

const OPTIONS = [
  { value: "list", label: "Ver como lista", icon: List },
  { value: "cards", label: "Ver como cartões", icon: LayoutGrid },
] as const;

export function ViewModeToggle({ view, onChange, className }: ViewModeToggleProps) {
  return (
    <div className={cn("flex shrink-0 rounded-full border border-border bg-background p-1", className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-label={label}
          aria-pressed={view === value}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
            view === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
