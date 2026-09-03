import { Header } from "../_components/header";
import { Footer } from "../_components/footer";
import { BottomNav } from "../_components/bottom-nav";
import { PatientLoginGate } from "../_components/patient-login-gate";
import { getCurrentPatient } from "../_actions/patient-auth";
import { findMyAppointments } from "./_actions/find-my-appointments";
import { MyAppointmentsContent } from "./_components/my-appointments-content";

export default async function MyAppointmentsPage() {
  const patient = await getCurrentPatient();

  let initialAppointments: Awaited<ReturnType<typeof findMyAppointments>>["data"] = [];
  if (patient) {
    const result = await findMyAppointments();
    initialAppointments = result.data ?? [];
  }

  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      <Header />
      <main className="flex-1 pt-24">
        {patient ? (
          <MyAppointmentsContent initialAppointments={initialAppointments ?? []} />
        ) : (
          <PatientLoginGate title="Entre para ver seus agendamentos" next="/agendamentos" />
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
