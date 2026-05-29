-- DropForeignKey
ALTER TABLE "public"."Appointments" DROP CONSTRAINT "Appointments_customerId_fkey";

-- AlterTable
ALTER TABLE "Appointments" ALTER COLUMN "customerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
