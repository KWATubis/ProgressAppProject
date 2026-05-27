-- CustomMetric + MetricEntry: user-defined metrics scoped to an activity,
-- with time-series entries the goal compute layer aggregates over.

CREATE TYPE "MetricAgg" AS ENUM ('LATEST', 'MAX', 'SUM', 'COUNT', 'AVG');
CREATE TYPE "MetricDir" AS ENUM ('HIGHER_BETTER', 'LOWER_BETTER');

CREATE TABLE "CustomMetric" (
  "id"             TEXT NOT NULL,
  "profileId"      TEXT NOT NULL,
  "activityTypeId" TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "unit"           TEXT NOT NULL,
  "aggregation"    "MetricAgg" NOT NULL DEFAULT 'LATEST',
  "direction"      "MetricDir" NOT NULL DEFAULT 'HIGHER_BETTER',
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomMetric_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomMetric_profileId_idx" ON "CustomMetric"("profileId");
CREATE INDEX "CustomMetric_activityTypeId_idx" ON "CustomMetric"("activityTypeId");

ALTER TABLE "CustomMetric"
  ADD CONSTRAINT "CustomMetric_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomMetric"
  ADD CONSTRAINT "CustomMetric_activityTypeId_fkey"
  FOREIGN KEY ("activityTypeId") REFERENCES "ActivityType"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MetricEntry" (
  "id"             TEXT NOT NULL,
  "customMetricId" TEXT NOT NULL,
  "date"           TIMESTAMP(3) NOT NULL,
  "value"          DOUBLE PRECISION NOT NULL,
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetricEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MetricEntry_customMetricId_date_idx" ON "MetricEntry"("customMetricId", "date");

ALTER TABLE "MetricEntry"
  ADD CONSTRAINT "MetricEntry_customMetricId_fkey"
  FOREIGN KEY ("customMetricId") REFERENCES "CustomMetric"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Link Goal -> CustomMetric (nullable; coexists with the existing string metricKey for built-ins).
ALTER TABLE "Goal" ADD COLUMN "customMetricId" TEXT;
CREATE INDEX "Goal_customMetricId_idx" ON "Goal"("customMetricId");

ALTER TABLE "Goal"
  ADD CONSTRAINT "Goal_customMetricId_fkey"
  FOREIGN KEY ("customMetricId") REFERENCES "CustomMetric"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
