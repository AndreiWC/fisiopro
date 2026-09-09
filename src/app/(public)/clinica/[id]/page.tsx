import { redirect } from "next/navigation";
import { getInfoOrganizationSchedule } from "./_data-access/get-info-organization-schedule";
import { ScheduleContent } from "./_components/schedule-content";
import { getCurrentPatient } from "../../_actions/patient-auth";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const organizationId = (await params).id;
  const [organization, patient] = await Promise.all([
    getInfoOrganizationSchedule({ organizationId }),
    getCurrentPatient(),
  ]);

  if (!organization) {
    redirect("/");
  }

  const knownPatient = patient
    ? { name: patient.name, email: patient.email, phone: patient.phone }
    : undefined;

  return <ScheduleContent clinic={organization} knownPatient={knownPatient} />;
}
