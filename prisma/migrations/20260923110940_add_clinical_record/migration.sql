-- CreateTable
CREATE TABLE "ClinicalRecord" (
    "id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deletedAt" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalRecord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClinicalRecord" ADD CONSTRAINT "ClinicalRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalRecord" ADD CONSTRAINT "ClinicalRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalRecord" ADD CONSTRAINT "ClinicalRecord_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalRecord" ADD CONSTRAINT "ClinicalRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
