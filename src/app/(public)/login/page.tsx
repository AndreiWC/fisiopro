import { redirect } from "next/navigation";
import getSession from "@/lib/getSession";
import { getCurrentPatient } from "../_actions/patient-auth";
import { LoginChooser } from "./_components/login-chooser";

export default async function LoginPage() {
  const clinicSession = await getSession();
  if (clinicSession) {
    redirect("/dashboard");
  }

  const patient = await getCurrentPatient();
  if (patient) {
    redirect("/perfil");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <LoginChooser />
    </main>
  );
}
