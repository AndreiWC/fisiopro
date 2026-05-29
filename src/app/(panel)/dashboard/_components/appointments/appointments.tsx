import { getTimesClinic } from "../../_data-access/get-times-clinic";
import { AppointmentsList } from "./appointments-list";
import { Suspense } from "react";

export async function Appointments({ userId }: { userId: string }) {
  const { times: timer, userId: id } = await getTimesClinic({ userId: userId });

  return (
    <Suspense fallback={<p>Carregando agendamentos...</p>}>
      <AppointmentsList times={timer} />
    </Suspense>
  );
}
