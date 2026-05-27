-- Link a WorkoutPlanExercise to a CustomMetric so logging that exercise
-- creates a MetricEntry per set automatically.

ALTER TABLE "WorkoutPlanExercise" ADD COLUMN "customMetricId" TEXT;
CREATE INDEX "WorkoutPlanExercise_customMetricId_idx" ON "WorkoutPlanExercise"("customMetricId");

ALTER TABLE "WorkoutPlanExercise"
  ADD CONSTRAINT "WorkoutPlanExercise_customMetricId_fkey"
  FOREIGN KEY ("customMetricId") REFERENCES "CustomMetric"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
