import { notFound } from "next/navigation";
import { getOrganizationDetail } from "./_data-access/get-organization-detail";
import { OrganizationDetailView } from "./_components/organization-detail-view";

export default async function AdminEmpresaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organization = await getOrganizationDetail(id);

  if (!organization) {
    notFound();
  }

  return <OrganizationDetailView organization={organization} />;
}
