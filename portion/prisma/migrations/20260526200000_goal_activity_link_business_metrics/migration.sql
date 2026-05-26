-- Add activityTypeId to Goal so an activity can carry a mini-goal.
ALTER TABLE "Goal" ADD COLUMN "activityTypeId" TEXT;
CREATE INDEX "Goal_profileId_activityTypeId_idx" ON "Goal"("profileId", "activityTypeId");
ALTER TABLE "Goal"
  ADD CONSTRAINT "Goal_activityTypeId_fkey"
  FOREIGN KEY ("activityTypeId") REFERENCES "ActivityType"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- BusinessMetric: per-day snapshot of clients / leads / deals for a BUSINESS activity.
CREATE TABLE "BusinessMetric" (
  "id"             TEXT NOT NULL,
  "profileId"      TEXT NOT NULL,
  "activityTypeId" TEXT NOT NULL,
  "date"           TIMESTAMP(3) NOT NULL,
  "clients"        INTEGER,
  "leads"          INTEGER,
  "deals"          INTEGER,
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessMetric_activityTypeId_date_key" ON "BusinessMetric"("activityTypeId", "date");
CREATE INDEX "BusinessMetric_profileId_activityTypeId_idx" ON "BusinessMetric"("profileId", "activityTypeId");

ALTER TABLE "BusinessMetric"
  ADD CONSTRAINT "BusinessMetric_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusinessMetric"
  ADD CONSTRAINT "BusinessMetric_activityTypeId_fkey"
  FOREIGN KEY ("activityTypeId") REFERENCES "ActivityType"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
