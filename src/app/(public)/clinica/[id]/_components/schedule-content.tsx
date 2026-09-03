"use client";

import { useState } from "react";
import type { Prisma } from "@prisma/client";
import { ClinicProfile } from "./clinic-profile";
import { BookingWizard } from "./booking-wizard";

type UserWithServiceAndSubscriptions = Prisma.UserGetPayload<{
  include: {
    services: true;
    subscription: true;
  };
}>;

interface ScheduleContentProps {
  clinic: UserWithServiceAndSubscriptions;
  knownPatient?: { name: string | null; email: string | null; phone: string | null };
}

export function ScheduleContent({ clinic, knownPatient }: ScheduleContentProps) {
  const [booking, setBooking] = useState<{ serviceId?: string } | null>(null);

  if (booking) {
    return (
      <BookingWizard
        clinic={clinic}
        initialServiceId={booking.serviceId}
        onDone={() => setBooking(null)}
        knownPatient={knownPatient}
      />
    );
  }

  return (
    <ClinicProfile
      clinic={clinic}
      onSelectService={(serviceId) => setBooking({ serviceId })}
      onStartBooking={() => setBooking({})}
    />
  );
}
