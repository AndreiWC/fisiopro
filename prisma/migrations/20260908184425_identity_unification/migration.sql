-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'STAFF');

-- DropForeignKey
ALTER TABLE "Appointments" DROP CONSTRAINT "Appointments_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Appointments" DROP CONSTRAINT "Appointments_userId_fkey";

-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_userId_fkey";

-- DropForeignKey
ALTER TABLE "Reminder" DROP CONSTRAINT "Reminder_userId_fkey";

-- DropForeignKey
ALTER TABLE "Service" DROP CONSTRAINT "Service_userId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- DropIndex
DROP INDEX "Customer_cpf_key";

-- DropIndex
DROP INDEX "Customer_userId_email_key";

-- DropIndex
DROP INDEX "Subscription_userId_key";

-- No production data to preserve (confirmed with project owner, test/dev database
-- only). Existing rows in these tables predate the Organization/Membership model
-- and cannot be mapped to an organizationId automatically, so they are cleared
-- before the now-required columns are added below. Deleted in child-to-parent
-- order with respect to the FKs just dropped above.
DELETE FROM "Appointments";
DELETE FROM "Customer";
DELETE FROM "Reminder";
DELETE FROM "Service";
DELETE FROM "Subscription";

-- AlterTable
ALTER TABLE "Appointments" DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "phone",
DROP COLUMN "userId",
ADD COLUMN     "organizationId" TEXT NOT NULL,
ALTER COLUMN "customerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "organizationId" TEXT NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Reminder" DROP COLUMN "userId",
ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Service" DROP COLUMN "userId",
ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "userId",
ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "address",
DROP COLUMN "professionalRegistration",
DROP COLUMN "segment",
DROP COLUMN "status",
DROP COLUMN "stripe_customer_id",
DROP COLUMN "times",
DROP COLUMN "timezone",
ALTER COLUMN "phone" DROP DEFAULT;

-- DropTable
DROP TABLE "Patient";

-- CreateTable
CREATE TABLE "PatientProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cpf" TEXT,
    "insuranceName" TEXT,
    "insuranceNumber" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'OWNER',
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "address" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "status" BOOLEAN NOT NULL DEFAULT true,
    "segment" "Segment",
    "professionalRegistration" TEXT,
    "timezone" TEXT,
    "times" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stripe_customer_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_userId_key" ON "PatientProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_cpf_key" ON "PatientProfile"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_organizationId_email_key" ON "Customer"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_organizationId_cpf_key" ON "Customer"("organizationId", "cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
