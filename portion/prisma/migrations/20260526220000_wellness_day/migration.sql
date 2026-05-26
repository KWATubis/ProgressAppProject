-- WellnessDay: per-day snapshot of Garmin-synced wellness data.
CREATE TABLE "WellnessDay" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "restingHeartRate" INTEGER,
    "minHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "avgHeartRate" INTEGER,
    "hrSamples" JSONB,
    "steps" INTEGER,
    "activeCalories" INTEGER,
    "restingCalories" INTEGER,
    "totalCalories" INTEGER,
    "sleepSeconds" INTEGER,
    "deepSleepSeconds" INTEGER,
    "lightSleepSeconds" INTEGER,
    "remSleepSeconds" INTEGER,
    "awakeSleepSeconds" INTEGER,
    "sleepStartTs" TIMESTAMP(3),
    "sleepEndTs" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WellnessDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WellnessDay_profileId_date_key" ON "WellnessDay"("profileId", "date");
CREATE INDEX "WellnessDay_profileId_date_idx" ON "WellnessDay"("profileId", "date");

ALTER TABLE "WellnessDay"
    ADD CONSTRAINT "WellnessDay_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
