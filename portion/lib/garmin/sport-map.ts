export type SportMapping = { name: string; slug: string; icon: string };

const MAP: Record<string, SportMapping> = {
  running: { name: "Running", slug: "running", icon: "🏃" },
  cycling: { name: "Cycling", slug: "cycling", icon: "🚴" },
  swimming: { name: "Swimming", slug: "swimming", icon: "🏊" },
};

// Every Garmin sport maps to a CARDIO ActivityType (distance/time/HR/laps).
export function mapSportToActivity(sport: string): SportMapping {
  return (
    MAP[sport] ?? {
      name: sport.charAt(0).toUpperCase() + sport.slice(1),
      slug: sport.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      icon: "⌚",
    }
  );
}
