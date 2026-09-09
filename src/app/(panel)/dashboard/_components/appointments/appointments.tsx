import { getTimesClinic } from "../../_data-access/get-times-clinic";
import { AppointmentsList } from "./appointments-list";
import { Suspense } from "react";

export async function Appointments({ organizationId }: { organizationId: string }) {
  const { times: timer, organizationId: id } = await getTimesClinic({ organizationId });

  return (
    <Suspense fallback={<p>Carregando agendamentos...</p>}>
      <AppointmentsList times={timer} organizationId={id} />
    </Suspense>
  );
}
