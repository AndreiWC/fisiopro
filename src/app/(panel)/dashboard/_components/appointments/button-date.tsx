"use client";
import { format } from "date-fns";
import { useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";

export function ButtonPickerAppointment() {
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const router = useRouter();

  function handleDateChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSelectedDate(event.target.value);
    const url = new URL(window.location.href);
    url.searchParams.set("date", event.target.value);
    router.push(url.toString());
  }
  return (
    <input
      type="date"
      id="start"
      className="border px-2 py-1 rounded-md text-sm md:text-base"
      value={selectedDate}
      onChange={handleDateChange}
    />
  );
}
