-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityKind" ADD VALUE 'SOCIAL';
ALTER TYPE "ActivityKind" ADD VALUE 'SIDE_INCOME';
ALTER TYPE "ActivityKind" ADD VALUE 'MAIN_INCOME';
ALTER TYPE "ActivityKind" ADD VALUE 'BUSINESS';

-- AlterTable
ALTER TABLE "ActivityType" ADD COLUMN     "pillar" "Pillar" NOT NULL DEFAULT 'HEALTH';

-- AlterTable
ALTER TABLE "IncomeEntry" ADD COLUMN     "activityTypeId" TEXT;

-- AlterTable
ALTER TABLE "SocialMetric" ADD COLUMN     "activityTypeId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "activityTypeId" TEXT;

-- CreateIndex
CREATE INDEX "ActivityType_profileId_pillar_idx" ON "ActivityType"("profileId", "pillar");

-- CreateIndex
CREATE INDEX "IncomeEntry_profileId_activityTypeId_idx" ON "IncomeEntry"("profileId", "activityTypeId");

-- CreateIndex
CREATE INDEX "SocialMetric_profileId_activityTypeId_idx" ON "SocialMetric"("profileId", "activityTypeId");

-- CreateIndex
CREATE INDEX "Task_profileId_activityTypeId_idx" ON "Task"("profileId", "activityTypeId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "ActivityType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialMetric" ADD CONSTRAINT "SocialMetric_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "ActivityType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeEntry" ADD CONSTRAINT "IncomeEntry_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "ActivityType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
