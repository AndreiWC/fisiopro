import { LabelSubscription } from "@/components/ui/label-subscription";
import { getAllServices } from "../_data-access/get-all-services";
import { ServicesList } from "./services-list";
import { canPermissions } from "@/utils/permissions/canPermissions";

interface ServicesContentProps {
  organizationId: string;
}

export async function ServicesContent({ organizationId }: ServicesContentProps) {
  const services = await getAllServices({ organizationId });
  const permissions = await canPermissions({ type: "service" });

  return (
    <>
      {!permissions.hasPermission && (
        <LabelSubscription expired={permissions.expired} />
      )}
      <ServicesList services={services.data || []} permissions={permissions} />
    </>
  );
}
