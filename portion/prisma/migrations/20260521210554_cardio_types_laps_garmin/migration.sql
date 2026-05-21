-- CreateEnum
CREATE TYPE "RunTrainingType" AS ENUM ('EASY', 'LONG', 'TEMPO', 'INTERVAL', 'FARTLEK', 'RECOVERY', 'RACE', 'GENERIC');

-- AlterTable
ALTER TABLE "WorkoutSession" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "RunEntry" ADD COLUMN     "trainingType" "RunTrainingType",
ADD COLUMN     "maxHRBpm" INTEGER,
ADD COLUMN     "calories" INTEGER,
ADD COLUMN     "elevationGainM" INTEGER,
ADD COLUMN     "avgCadence" INTEGER;

-- CreateTable
CREATE TABLE "RunLap" (
    "id" TEXT NOT NULL,
    "runEntryId" TEXT NOT NULL,
    "lapIndex" INTEGER NOT NULL,
    "distanceM" DOUBLE PRECISION,
    "durationSec" DOUBLE PRECISION,
    "avgPaceSecPerKm" INTEGER,
    "avgHRBpm" INTEGER,
    "maxHRBpm" INTEGER,
    "avgCadence" INTEGER,
    "isWork" BOOLEAN NOT NULL DEFAULT true,
    "recoverySec" INTEGER,

    CONSTRAINT "RunLap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSession_profileId_externalId_key" ON "WorkoutSession"("profileId", "externalId");

-- AddForeignKey
ALTER TABLE "RunLap" ADD CONSTRAINT "RunLap_runEntryId_fkey" FOREIGN KEY ("runEntryId") REFERENCES "RunEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
