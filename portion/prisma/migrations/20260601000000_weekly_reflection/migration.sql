CREATE TABLE "WeeklyReflection" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "wins" TEXT NOT NULL DEFAULT '',
  "learning" TEXT NOT NULL DEFAULT '',
  "priority" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeeklyReflection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WeeklyReflection_profileId_weekStart_key" ON "WeeklyReflection"("profileId", "weekStart");
CREATE INDEX "WeeklyReflection_profileId_idx" ON "WeeklyReflection"("profileId");

ALTER TABLE "WeeklyReflection"
  ADD CONSTRAINT "WeeklyReflection_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
