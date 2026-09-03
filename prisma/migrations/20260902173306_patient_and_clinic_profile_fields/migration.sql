-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "insuranceName" TEXT,
ADD COLUMN     "insuranceNumber" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "professionalRegistration" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Patient_cpf_key" ON "Patient"("cpf");

