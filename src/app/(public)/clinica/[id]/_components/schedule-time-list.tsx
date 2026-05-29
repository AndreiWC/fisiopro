"use client";
import { Button } from "@/components/ui/button";
import { TimeSlot } from "./schedule-content";
import { cn } from "@/lib/utils";

import {
  isToday,
  isSlotInThePast,
  isSlotSequenceAvailable,
} from "./schedule-utils";
interface ScheduleTimeListProps {
  selectedDate: Date;
  selectedTime: string;
  requiredSlots: number;
  blockTimes: string[];
  availableTimes: TimeSlot[];
  clinicTimes: string[];
  onSelectTime?: (time: string) => void;
}

export function ScheduleTimeList({
  selectedDate,
  availableTimes,
  blockTimes,
  clinicTimes,
  requiredSlots,
  selectedTime,
  onSelectTime,
}: ScheduleTimeListProps) {
  const dateIsToday = isToday(selectedDate);

  return (
    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
      {availableTimes.map((Slot) => {
        const sequenciaOK = isSlotSequenceAvailable(
          Slot.time,
          requiredSlots,
          clinicTimes,
          blockTimes,
        );

        const slotIsPast = dateIsToday && isSlotInThePast(Slot.time);
        const SlotEnabled = Slot.available && sequenciaOK && !slotIsPast;

        return (
          <Button
            onClick={() =>
              SlotEnabled && onSelectTime && onSelectTime(Slot.time)
            }
            type="button"
            key={Slot.time}
            variant="outline"
            className={cn(
              "h-10 select-none",
              selectedTime === Slot.time &&
                "border-2 border-blue-500 text-primary",
              !SlotEnabled && "cursor-not-allowed opacity-50",
            )}
            disabled={slotIsPast}
          >
            {Slot.time}
          </Button>
        );
      })}
    </div>
  );
}
