-- Enable Row Level Security on all user-owned tables.
--
-- The app uses Prisma with the Supabase `postgres` role, which has BYPASSRLS,
-- so these policies do NOT affect server-side queries. They are a safety net
-- against direct Supabase client access using the `anon` / `authenticated`
-- roles (e.g. future realtime subscriptions, accidental key exposure).
--
-- Pattern:
--   * `profileId` tables → `auth.uid()::text = "profileId"`
--   * Profile           → `auth.uid()::text = id`
--   * Child tables      → EXISTS against owning parent
--   * Exercise (shared library) → open to authenticated reads + inserts

-- ─── Profile ────────────────────────────────────────────────────────────────
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_owner_all" ON "Profile"
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()::text) = id)
  WITH CHECK ((SELECT auth.uid()::text) = id);

-- ─── Tables with profileId ──────────────────────────────────────────────────
ALTER TABLE "OnboardingSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_owner_all" ON "OnboardingSession"
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()::text) = "profileId")
  WITH CHECK ((SELECT auth.uid()::text) = "profileId");

ALTER TABLE "Goal" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goal_owner_all" ON "Goal"
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()::text) = "profileId")
  WITH CHECK ((SELECT auth.uid()::text) = "profileId");

ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_owner_all" ON "Task"
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()::text) = "profileId")
  WITH CHECK ((SELECT auth.uid()::text) = "profileId");

ALTER TABLE "TaskLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasklog_owner_all" ON "TaskLog"
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()::text) = "profileId")
  WITH CHECK ((SELECT auth.uid()::text) = "profileId");

ALTER TABLE "ActivityType" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activitytype_owner_all" ON "ActivityType"
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()::text) = "profileId")
  WITH CHECK ((SELECT auth.uid()::text) = "profileId");

ALTER TABLE "WorkoutPlan" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workoutplan_owner_all" ON "WorkoutPlan"
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()::text) = "profileId")
  WITH CHECK ((SELECT auth.uid()::text) = "profileId");

ALTER TABLE "WorkoutSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workoutsession_owner_all" ON "WorkoutSession"
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()::text) = "profileId")
  WITH CHECK ((SELECT auth.uid()::text) = "profileId");

ALTER TABLE "DietLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dietlog_owner_all" ON "DietLog"
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()::text) = "profileId")
  WITH CHECK ((SELECT auth.uid()::text) = "profileId");

ALTER TABLE "BodyMetric" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bodymetric_owner_all" ON "BodyMetric"
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()::text) = "profileId")
  WITH CHECK ((SELECT auth.uid()::text) = "profileId");

ALTER TABLE "SocialMetric" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "socialmetric_owner_all" ON "SocialMetric"
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()::text) = "profileId")
  WITH CHECK ((SELECT auth.uid()::text) = "profileId");

ALTER TABLE "IncomeEntry" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incomeentry_owner_all" ON "IncomeEntry"
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()::text) = "profileId")
  WITH CHECK ((SELECT auth.uid()::text) = "profileId");

-- ─── Child tables (joined to owner via parent) ──────────────────────────────
ALTER TABLE "WorkoutPlanDay" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workoutplanday_owner_all" ON "WorkoutPlanDay"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "WorkoutPlan" wp
      WHERE wp.id = "WorkoutPlanDay"."planId"
        AND (SELECT auth.uid()::text) = wp."profileId"
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "WorkoutPlan" wp
      WHERE wp.id = "WorkoutPlanDay"."planId"
        AND (SELECT auth.uid()::text) = wp."profileId"
    )
  );

ALTER TABLE "WorkoutPlanExercise" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workoutplanexercise_owner_all" ON "WorkoutPlanExercise"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "WorkoutPlanDay" d
      JOIN "WorkoutPlan" wp ON wp.id = d."planId"
      WHERE d.id = "WorkoutPlanExercise"."dayId"
        AND (SELECT auth.uid()::text) = wp."profileId"
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "WorkoutPlanDay" d
      JOIN "WorkoutPlan" wp ON wp.id = d."planId"
      WHERE d.id = "WorkoutPlanExercise"."dayId"
        AND (SELECT auth.uid()::text) = wp."profileId"
    )
  );

ALTER TABLE "ExerciseSet" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exerciseset_owner_all" ON "ExerciseSet"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "WorkoutSession" ws
      WHERE ws.id = "ExerciseSet"."sessionId"
        AND (SELECT auth.uid()::text) = ws."profileId"
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "WorkoutSession" ws
      WHERE ws.id = "ExerciseSet"."sessionId"
        AND (SELECT auth.uid()::text) = ws."profileId"
    )
  );

ALTER TABLE "RunEntry" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runentry_owner_all" ON "RunEntry"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "WorkoutSession" ws
      WHERE ws.id = "RunEntry"."sessionId"
        AND (SELECT auth.uid()::text) = ws."profileId"
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "WorkoutSession" ws
      WHERE ws.id = "RunEntry"."sessionId"
        AND (SELECT auth.uid()::text) = ws."profileId"
    )
  );

ALTER TABLE "RunLap" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runlap_owner_all" ON "RunLap"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "RunEntry" re
      JOIN "WorkoutSession" ws ON ws.id = re."sessionId"
      WHERE re.id = "RunLap"."runEntryId"
        AND (SELECT auth.uid()::text) = ws."profileId"
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "RunEntry" re
      JOIN "WorkoutSession" ws ON ws.id = re."sessionId"
      WHERE re.id = "RunLap"."runEntryId"
        AND (SELECT auth.uid()::text) = ws."profileId"
    )
  );

-- ─── Shared library (no owner) ──────────────────────────────────────────────
-- Exercise is a global lookup table populated via `connectOrCreate` whenever a
-- user logs a new exercise name. Any authenticated user can read it; only
-- inserts are allowed (no updates/deletes from authenticated role).
ALTER TABLE "Exercise" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercise_auth_read" ON "Exercise"
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "exercise_auth_insert" ON "Exercise"
  FOR INSERT TO authenticated
  WITH CHECK (true);
