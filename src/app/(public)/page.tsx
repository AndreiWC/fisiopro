import { Footer } from "./_components/footer";
import { Header } from "./_components/header";
import { Hero } from "./_components/hero";
import { Profissional } from "./_components/profissionals";
import { getProfessionals } from "./_data-access/get-professionals";

export const revalidate = 120;

export default async function Home() {
  const professionals = await getProfessionals();
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div>
        <Hero />
        <Profissional professionals={professionals || []} />
        <Footer />
      </div>
    </div>
  );
}
