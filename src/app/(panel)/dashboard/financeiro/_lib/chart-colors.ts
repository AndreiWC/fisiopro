/** Cores dos gráficos do financeiro — variáveis CSS de globals.css (já com versão para modo escuro). */
export const CHART_COLORS = {
  revenue: "var(--chart-1)",
  previous: "var(--chart-slate)",
  completed: "var(--chart-1)",
  noShow: "var(--chart-2)",
  cancelled: "var(--chart-slate)",
  grid: "var(--border)",
} as const;

/** Uma cor por serviço, na ordem do ranking; "Outros" sempre usa cinza. */
export const SERVICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-blue)",
  "var(--chart-4)",
  "var(--chart-violet)",
  "var(--chart-teal)",
  "var(--chart-2)",
] as const;

export const OTHER_SERVICES_COLOR = "var(--chart-slate)";

export function serviceColor(name: string, index: number) {
  return name === "Outros" ? OTHER_SERVICES_COLOR : SERVICE_COLORS[index % SERVICE_COLORS.length];
}
