-- Strava OAuth integration: per-user token storage (one row per profile).
CREATE TABLE "StravaAccount" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "stravaAthleteId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StravaAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StravaAccount_profileId_key" ON "StravaAccount"("profileId");

ALTER TABLE "StravaAccount" ADD CONSTRAINT "StravaAccount_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
