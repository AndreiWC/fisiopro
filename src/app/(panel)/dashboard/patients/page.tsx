import { redirect } from "next/navigation";
import getSession from "@/lib/getSession";
import { getPatients } from "./_data-access/get-patients";
import { PatientsList } from "./_components/patients-list";

export default async function PatientsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const patients = await getPatients({ userId: session.user.id! });

  return (
    <main>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Pacientes
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe quem já passou pela sua clínica e em que fase do tratamento está.
        </p>
      </div>

      <div className="mt-4">
        <PatientsList patients={patients} />
      </div>
    </main>
  );
}
