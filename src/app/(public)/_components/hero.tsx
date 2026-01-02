import { Button } from "@/components/ui/button";
import Image from "next/image";
import doctorimage from "../../../../public/profissional em branco.png";

export function Hero() {
  return (
    <section className="bg-write">
      <div className="container mx-auto px-4 pt-20 pb-4 sm:pb-0 sm:px-6 lg:px-8">
        <main className="flex items-center justify-center">
          <article className="flex-[2] max-w-3x1 space-y-8 flex flex-col justify-center">
            <h1 className="text-4xl lg:text-5xl font-bold max-w-2x1 tracking-tight">
              Encontre os melhores Profissionais em um único local!
            </h1>

            <p className="text-base md:text-lg text-gray-600">
              Nós somos uma plataforma para Profissionais de saúde com foco em
              agilizar seu atendimento de forma simplificada e organizada.
            </p>
            <Button className="bg-blue-500 hover:bg-blue-400 w-fit px-6 font-semibold">
              Encontre uma clínica
            </Button>
          </article>

          <div className=" hidden lg:block">
            <Image
              src={doctorimage}
              alt="Foto ilustativa profissional da saúde"
              width={540}
              height={600}
              className="object-contain"
            ></Image>
          </div>
        </main>
      </div>
    </section>
  );
}
