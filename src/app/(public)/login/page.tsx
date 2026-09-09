import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveOrganization, getActivePatientProfile } from "@/lib/organization";
import { LoginChooser } from "../_components/login-chooser";
import { RoleChooser } from "../_components/role-chooser";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
        <LoginChooser next={next} />
      </main>
    );
  }

  const [organization, patientProfile] = await Promise.all([
    getActiveOrganization(),
    getActivePatientProfile(),
  ]);

  if (organization) {
    redirect("/dashboard");
  }
  if (patientProfile) {
    redirect(next && next.startsWith("/") ? next : "/perfil");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <RoleChooser next={next} />
    </main>
  );
}
