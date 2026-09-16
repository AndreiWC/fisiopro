import { requireActiveOrganization } from "@/lib/organization";
import { AttendanceList } from "./_components/attendance-list";

export default async function AtendimentosPage() {
  const organization = await requireActiveOrganization();

  return (
    <main>
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Atendimentos
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Feche o status dos agendamentos já realizados.
        </p>
      </div>

      <div className="my-6">
        <AttendanceList organizationId={organization.id} />
      </div>
    </main>
  );
}
