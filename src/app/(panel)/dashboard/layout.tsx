import { SidebarDashboard } from "./_components/sidebar";

 

//ESSA PAGINA ENVOLVE TODAS AS OUTRAS PAGINAS
export default function DashboardLayout({children,}:{children: React.ReactNode}){
return(
    <>
    <SidebarDashboard>
    {children}
    </SidebarDashboard>
    </>
)
}