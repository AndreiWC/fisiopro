import { getOrganizations } from "./_data-access/get-organizations";
import { EmpresasList } from "./_components/empresas-list";

export default async function AdminEmpresasPage() {
  const organizations = await getOrganizations();

  return (
    <main className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Empresas
        </h1>
        <p className="text-sm text-muted-foreground">
          Todas as empresas cadastradas no FisioPro e suas assinaturas.
        </p>
      </div>

      <EmpresasList organizations={organizations} />
    </main>
  );
}
