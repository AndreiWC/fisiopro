import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * True se `next` é um caminho seguro para redirecionar dentro do próprio site.
 *
 * Uma checagem por prefixo de string (`next.startsWith("/") && !next.startsWith("//")`)
 * não é suficiente: navegadores normalizam `\` para `/` ao resolver uma referência
 * relativa contra uma base http(s), então `/\evil.com` também resolve para um host
 * externo (`new URL("/\\evil.com", "https://example.com").href` → `"https://evil.com/"`).
 * Resolvendo contra uma origem fixa e comparando origens, capturamos qualquer forma de
 * redirecionamento cross-origin (`//evil.com`, `/\evil.com`, `https://evil.com`, etc.).
 */
export function isSafeRedirectTarget(next: string | undefined | null): next is string {
  if (!next) return false
  try {
    const url = new URL(next, "http://localhost")
    return url.origin === "http://localhost"
  } catch {
    return false
  }
}
