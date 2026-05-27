/**
 * Calls Google Gemini 2.5 Flash to suggest the shape of a custom metric from
 * a goal title. Returns null when the API key is missing so callers can
 * gracefully hide the "Suggest with AI" affordance instead of erroring.
 *
 * Free tier: 15 RPM / 1500 RPD / 1M TPM as of 2026. Get a key at
 * https://aistudio.google.com/apikey and drop it in `.env.local` as
 * GOOGLE_AI_API_KEY.
 */

export type MetricAgg = "LATEST" | "MAX" | "SUM" | "COUNT" | "AVG";
export type MetricDir = "HIGHER_BETTER" | "LOWER_BETTER";

export type SuggestedMetric = {
  title: string;
  unit: string;
  aggregation: MetricAgg;
  direction: MetricDir;
  rationale?: string;
};

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_PROMPT = `You shape user-defined progress metrics for a fitness + income tracker.

Given a short goal title (sometimes natural language, sometimes terse), return ONE JSON object describing how to track it:

{
  "title": short noun phrase suitable as a metric name (e.g. "Front Lever Hold", "Cold Approaches", "Bench Press 1RM"),
  "unit": short unit word ("seconds", "reps", "kg", "km", "approaches", "posts", "deals", "zł", "$"),
  "aggregation": one of LATEST | MAX | SUM | COUNT | AVG,
  "direction": HIGHER_BETTER or LOWER_BETTER,
  "rationale": one short sentence
}

Aggregation guide:
- LATEST → latest snapshot (body weight, follower count, current bench 1RM if measured continuously)
- MAX    → personal best (longest hold, heaviest lift, longest run)
- SUM    → cumulative total (km run this month, posts published)
- COUNT  → number of entries (cold approaches, meals tracked, gym sessions)
- AVG    → typical value (avg session length, avg sleep hours)

Direction guide:
- HIGHER_BETTER → bigger numbers = better (most fitness/income goals)
- LOWER_BETTER  → smaller numbers = better (body fat %, cut weight, marathon time)

Examples:
"hold a 10-second front tuck lever" → {"title":"Front Lever Hold","unit":"seconds","aggregation":"MAX","direction":"HIGHER_BETTER","rationale":"Track personal best hold time."}
"lose 5 kg" → {"title":"Body Weight","unit":"kg","aggregation":"LATEST","direction":"LOWER_BETTER","rationale":"Latest weigh-in matters."}
"100 cold approaches this month" → {"title":"Cold Approaches","unit":"approaches","aggregation":"COUNT","direction":"HIGHER_BETTER","rationale":"Count each approach entry."}
"100 km this month" → {"title":"Distance Run","unit":"km","aggregation":"SUM","direction":"HIGHER_BETTER","rationale":"Sum all logged runs."}

Return ONLY the JSON object. No prose, no markdown fences.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    unit: { type: "STRING" },
    aggregation: {
      type: "STRING",
      enum: ["LATEST", "MAX", "SUM", "COUNT", "AVG"],
    },
    direction: {
      type: "STRING",
      enum: ["HIGHER_BETTER", "LOWER_BETTER"],
    },
    rationale: { type: "STRING" },
  },
  required: ["title", "unit", "aggregation", "direction"],
};

export function isAiConfigured(): boolean {
  return !!process.env.GOOGLE_AI_API_KEY;
}

export async function suggestMetricFromTitle(
  title: string,
): Promise<SuggestedMetric | null> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) return null;

  const trimmed = title.trim();
  if (!trimmed) return null;

  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: trimmed }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).title !== "string" ||
    typeof (parsed as Record<string, unknown>).unit !== "string"
  ) {
    return null;
  }

  const p = parsed as Record<string, unknown>;
  const agg = p.aggregation;
  const dir = p.direction;
  if (
    typeof agg !== "string" ||
    !["LATEST", "MAX", "SUM", "COUNT", "AVG"].includes(agg) ||
    typeof dir !== "string" ||
    !["HIGHER_BETTER", "LOWER_BETTER"].includes(dir)
  ) {
    return null;
  }

  return {
    title: (p.title as string).trim().slice(0, 80),
    unit: (p.unit as string).trim().slice(0, 20),
    aggregation: agg as MetricAgg,
    direction: dir as MetricDir,
    rationale: typeof p.rationale === "string" ? p.rationale : undefined,
  };
}
