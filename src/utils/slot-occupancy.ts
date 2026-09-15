export interface SlotOccupant {
  time: string;
  service: { duration: number };
}

/** Slots (from `times`) occupied by one appointment, expanded from its start `time` + `service.duration`. */
export function expandAppointmentSlots<T extends SlotOccupant>(
  appointment: T,
  times: string[],
): string[] {
  const requiredSlots = Math.ceil(appointment.service.duration / 30);
  const startIndex = times.indexOf(appointment.time);
  if (startIndex === -1) return [];

  const slots: string[] = [];
  for (let i = 0; i < requiredSlots; i++) {
    const slot = times[startIndex + i];
    if (slot) slots.push(slot);
  }
  return slots;
}

/** slot -> appointment, built by expanding every appointment across its occupied slots. */
export function buildOccupantMap<T extends SlotOccupant>(
  appointments: T[],
  times: string[],
): Map<string, T> {
  const map = new Map<string, T>();
  for (const appointment of appointments) {
    for (const slot of expandAppointmentSlots(appointment, times)) {
      map.set(slot, appointment);
    }
  }
  return map;
}

export function computeOccupancyPercent(occupiedSlotCount: number, totalSlots: number): number {
  return totalSlots > 0 ? Math.round((occupiedSlotCount / totalSlots) * 100) : 0;
}
