import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
  /** "onDark": for placement over the dark sidebar chrome. */
  tone?: "default" | "onDark";
}

/**
 * Mark: two tabs clicking together — the "encaixe" that gives the product its name.
 * Reused as the loose visual motif for available time slots across the product.
 */
export function Logo({
  className,
  iconClassName,
  wordmarkClassName,
  showWordmark = true,
  tone = "default",
}: LogoProps) {
  const onDark = tone === "onDark";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className={cn("h-7 w-7 shrink-0", iconClassName)}
      >
        <rect x="2" y="6" width="20" height="20" rx="7" className="fill-primary" />
        <rect x="17" y="11" width="13" height="13" rx="4" className="fill-accent-warm" />
      </svg>
      {showWordmark && (
        <span
          className={cn(
            "font-display text-xl font-semibold tracking-tight",
            onDark ? "text-sidebar-foreground" : "text-foreground",
            wordmarkClassName,
          )}
        >
          encaixa
        </span>
      )}
    </span>
  );
}
