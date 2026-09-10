import { requireAdminSession } from "@/lib/require-admin";
import { AdminSidebar } from "./_components/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return <AdminSidebar>{children}</AdminSidebar>;
}
