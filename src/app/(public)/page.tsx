import { Footer } from "./_components/footer";
import { Header } from "./_components/header";
import { Hero } from "./_components/hero";
import { Profissional } from "./_components/profissionals";

export default function Home(){

  return(    
    <div className="flex flex-col min-h-screen">
      <Header/>
      <div>
        <Hero />
        <Profissional/>
        <Footer/>
      </div>

    </div>
  )
}