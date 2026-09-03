import type { CompletionItem } from "../_data-access/get-profile-overview";

interface ProfileOverviewProps {
  activePatients: number;
  totalPatients: number;
  sessionsCompleted: number;
  noShowRate: number | null;
  completion: CompletionItem[];
  completionPercent: number;
}

export function ProfileOverview({
  activePatients,
  totalPatients,
  sessionsCompleted,
  noShowRate,
  completion,
  completionPercent,
}: ProfileOverviewProps) {
  const missing = completion.filter((item) => !item.done);

  return (
    <div className="mx-auto mb-4 max-w-2xl space-y-4">
      {completionPercent < 100 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              Cadastro {completionPercent}% completo
            </p>
            <span className="text-sm text-muted-foreground">
              {missing.length} {missing.length === 1 ? "pendência" : "pendências"}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          {missing.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {missing.map((item) => (
                <li key={item.label} className="text-sm text-muted-foreground">
                  · {item.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatTile label="Pacientes ativos" value={String(activePatients)} hint={`${totalPatients} no total`} />
        <StatTile label="Sessões concluídas" value={String(sessionsCompleted)} />
        <StatTile
          label="Taxa de faltas"
          value={noShowRate !== null ? `${noShowRate}%` : "—"}
        />
      </div>
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
