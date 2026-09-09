import { Header } from "../_components/header";
import { Footer } from "../_components/footer";
import { BottomNav } from "../_components/bottom-nav";
import { PatientLoginGate } from "../_components/patient-login-gate";
import { getCurrentPatient } from "../_actions/patient-auth";
import { getPatientStats } from "./_data-access/get-patient-stats";
import { ProfileContent } from "./_components/profile-content";

export default async function PerfilPage() {
  const patient = await getCurrentPatient();
  const stats = patient
    ? await getPatientStats(patient.id)
    : { sessionsCompleted: 0, activeAppointments: 0, activeClinics: 0, attendanceRate: null };

  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      <Header />
      <main className="flex-1 pt-24">
        {patient ? (
          <ProfileContent patient={patient} stats={stats} />
        ) : (
          <PatientLoginGate title="Entre para ver seu perfil" />
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
