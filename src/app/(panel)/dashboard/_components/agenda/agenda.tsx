import { getTimesClinic } from "../../_data-access/get-times-clinic";
import { getAllServices } from "../../services/_data-access/get-all-services";
import { AgendaShell } from "./agenda-shell";

export async function Agenda({ organizationId }: { organizationId: string }) {
  const { times, organizationId: id } = await getTimesClinic({ organizationId });
  const servicesResult = await getAllServices({ organizationId });
  const services = ("data" in servicesResult ? servicesResult.data : []) ?? [];

  return <AgendaShell organizationId={id} times={times} services={services} />;
}
