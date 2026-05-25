-- AlterTable
ALTER TABLE "Task" ADD COLUMN "durationMin" INTEGER;

-- CreateTable
CREATE TABLE "TaskDayOrder" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "TaskDayOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskDayOrder_taskId_date_key" ON "TaskDayOrder"("taskId", "date");

-- CreateIndex
CREATE INDEX "TaskDayOrder_profileId_date_idx" ON "TaskDayOrder"("profileId", "date");

-- AddForeignKey
ALTER TABLE "TaskDayOrder" ADD CONSTRAINT "TaskDayOrder_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDayOrder" ADD CONSTRAINT "TaskDayOrder_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: match the pattern used by other profileId-owned tables. Prisma uses the
-- postgres role which has BYPASSRLS, so this only affects direct supabase-client
-- access from the anon/authenticated roles.
ALTER TABLE "TaskDayOrder" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taskdayorder_owner_all" ON "TaskDayOrder"
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()::text) = "profileId")
  WITH CHECK ((SELECT auth.uid()::text) = "profileId");
