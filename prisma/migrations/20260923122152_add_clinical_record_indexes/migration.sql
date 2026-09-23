-- CreateIndex
CREATE INDEX "ClinicalRecord_organizationId_deletedAt_idx" ON "ClinicalRecord"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "ClinicalRecord_customerId_deletedAt_idx" ON "ClinicalRecord"("customerId", "deletedAt");
