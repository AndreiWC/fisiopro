export function isToday(date: Date) {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function isSlotInThePast(slotTime: string) {
  const [slotHours, slotMinutes] = slotTime.split(":").map(Number);

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  if (slotHours < currentHours) {
    return true;
  } else if (slotHours === currentHours && slotMinutes <= currentMinutes) {
    return true;
  }

  return false;
}

export function isSlotSequenceAvailable(
  startSlot: string, // primeiro horário do disponivel
  requiredSlots: number, //quantidade de slots necessários para o serviço
  allSlots: string[], //todos os horários disponíveis da clínica
  blockedSlots: string[], //horários bloqueados por outros agendamento
) {
  const startIndex = allSlots.indexOf(startSlot);
  if (startIndex === -1 || startIndex + requiredSlots > allSlots.length) {
    return false; // Slot inicial não encontrado ou não há slots suficientes
  }

  for (let i = startIndex; i < startIndex + requiredSlots; i++) {
    const slotTime = allSlots[i];
    if (blockedSlots.includes(slotTime)) {
      return false; // Um dos slots necessários está bloqueado
    }
  }
  return true;
}
