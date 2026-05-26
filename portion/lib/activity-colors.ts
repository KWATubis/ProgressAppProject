/**
 * Curated palette for activity tags. Each colour is bright enough to read on
 * the dark theme. Picked values match the existing chart palette.
 */
export const ACTIVITY_COLORS = [
  "#818cf8", // indigo
  "#34d399", // emerald
  "#fbbf24", // amber
  "#fb7185", // rose
  "#22d3ee", // cyan
  "#c084fc", // violet
  "#fb923c", // orange
  "#f472b6", // pink
] as const;

export type ActivityColor = (typeof ACTIVITY_COLORS)[number];

export function isValidColor(v: string | null | undefined): v is string {
  if (!v) return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
}
