import { redirect } from "next/navigation";
import { getInfoSchedule } from "./_data-access/get-info-schedule";
import { ScheduleContent } from "./_components/schedule-content";
import { getCurrentPatient } from "../../_actions/patient-auth";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = (await params).id;
  const [user, patient] = await Promise.all([
    getInfoSchedule({ userId }),
    getCurrentPatient(),
  ]);

  if (!user) {
    redirect("/");
  }

  const knownPatient = patient
    ? { name: patient.name, email: patient.email, phone: patient.phone }
    : undefined;

  return <ScheduleContent clinic={user} knownPatient={knownPatient} />;
}
