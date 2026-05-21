-- CreateEnum
CREATE TYPE "ExerciseMetric" AS ENUM ('REPS', 'TIME');

-- AlterTable
ALTER TABLE "WorkoutPlanExercise" ADD COLUMN     "metric" "ExerciseMetric" NOT NULL DEFAULT 'REPS';
