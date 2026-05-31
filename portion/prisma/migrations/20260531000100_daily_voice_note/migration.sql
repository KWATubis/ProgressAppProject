-- Phase 2: Voice-note daily check-in. One audio note per profile per day.
CREATE TABLE "DailyVoiceNote" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "storagePath" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "transcript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyVoiceNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyVoiceNote_profileId_date_key" ON "DailyVoiceNote"("profileId", "date");

CREATE INDEX "DailyVoiceNote_profileId_idx" ON "DailyVoiceNote"("profileId");

ALTER TABLE "DailyVoiceNote" ADD CONSTRAINT "DailyVoiceNote_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
