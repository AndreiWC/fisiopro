import { Footer } from "./_components/footer";
import { Header } from "./_components/header";
import { PatientDiscovery } from "./_components/patient-discovery";
import { BottomNav } from "./_components/bottom-nav";
import { getProfessionals } from "./_data-access/get-professionals";

export const revalidate = 120;

export default async function Home() {
  const professionals = await getProfessionals();
  return (
    <div className="flex flex-col min-h-screen pb-16 md:pb-0">
      <Header />
      <div>
        <PatientDiscovery professionals={professionals || []} />
        <Footer />
      </div>
      <BottomNav />
    </div>
  );
}
