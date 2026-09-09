import { redirect } from "next/navigation";
import { getActiveOrganization } from "@/lib/organization";
import { SidebarDashboard } from "./_components/sidebar";



//ESSA PAGINA ENVOLVE TODAS AS OUTRAS PAGINAS
export default async function DashboardLayout({children,}:{children: React.ReactNode}){
const organization = await getActiveOrganization();
if (!organization) {
  redirect("/perfil");
}

return(
    <>
    <SidebarDashboard>
    {children}
    </SidebarDashboard>
    </>
)
}