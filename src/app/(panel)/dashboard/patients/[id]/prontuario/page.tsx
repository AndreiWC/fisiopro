import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import getSession from "@/lib/getSession";
import { requireActiveOrganization } from "@/lib/organization";
import { canPermissions } from "@/utils/permissions/canPermissions";
import { LabelSubscription } from "@/components/ui/label-subscription";
import { getPatientSummary } from "./_data-access/get-patient-summary";
import { getClinicalRecords } from "./_data-access/get-clinical-records";
import { ClinicalRecordList } from "./_components/clinical-record-list";

export default async function PatientClinicalRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const organization = await requireActiveOrganization();
  const patient = await getPatientSummary({
    customerId: id,
    organizationId: organization.id,
  });
  if (!patient) {
    notFound();
  }

  const [records, permissions] = await Promise.all([
    getClinicalRecords({ customerId: id, organizationId: organization.id }),
    canPermissions({ type: "clinicalRecord" }),
  ]);

  return (
    <main className="space-y-4">
      <Link
        href="/dashboard/patients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para pacientes
      </Link>

      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Prontuário de {patient.name || "paciente"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Histórico de sessões e anotações clínicas.
        </p>
      </div>

      {!permissions.hasPermission && (
        <LabelSubscription expired={permissions.expired} />
      )}

      <ClinicalRecordList
        records={records}
        customerId={patient.id}
        organizationId={organization.id}
        permissions={permissions}
      />
    </main>
  );
}
