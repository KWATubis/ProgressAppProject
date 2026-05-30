import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { WeeklySummary, WeeklyMetric } from "@/lib/dashboard/weekly-summary";

const W = 1080;
const H = 1920;

const COLORS = {
  bg0: "#0b0b0d",
  bg1: "#141417",
  fg: "#fafafa",
  muted: "#8b8b93",
  good: "#34d399", // emerald-400
  bad: "#fb7185", // rose-400
  card: "rgba(255,255,255,0.04)",
  cardBorder: "rgba(255,255,255,0.09)",
};

/** Same red→yellow→green ramp as the dashboard ring. */
function progressColor(pct: number): string {
  const hue = (Math.max(0, Math.min(100, pct)) / 100) * 120;
  return `hsl(${hue.toFixed(0)}, 75%, 52%)`;
}

function deltaColor(good: boolean | null): string {
  if (good === true) return COLORS.good;
  if (good === false) return COLORS.bad;
  return COLORS.muted;
}

export type CardFonts = { anton: Buffer; serif: Buffer; serifItalic: Buffer };

export async function loadCardFonts(): Promise<CardFonts> {
  const dir = join(process.cwd(), "app/api/progress-card/fonts");
  const [anton, serif, serifItalic] = await Promise.all([
    readFile(join(dir, "Anton-Regular.ttf")),
    readFile(join(dir, "InstrumentSerif-Regular.ttf")),
    readFile(join(dir, "InstrumentSerif-Italic.ttf")),
  ]);
  return { anton, serif, serifItalic };
}

export function renderProgressCard({
  summary,
  firstName,
  fonts,
}: {
  summary: WeeklySummary;
  firstName: string;
  fonts: CardFonts;
}): ImageResponse {
  const { scorePct, judged, good, metrics, headline, weekLabel } = summary;
  const ringColor = progressColor(scorePct);

  // Progress ring rendered as an <img> data-URI (Satori dislikes raw multi-child <svg>).
  const R = 54;
  const C = 2 * Math.PI * R;
  const dashOffset = judged > 0 ? C * (1 - scorePct / 100) : C;
  const ringSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="460" viewBox="0 0 120 120">` +
    `<circle cx="60" cy="60" r="${R}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>` +
    `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${ringColor}" stroke-width="8" stroke-linecap="round" ` +
    `stroke-dasharray="${C}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 60 60)"/></svg>`;
  const ringSrc = `data:image/svg+xml;utf8,${encodeURIComponent(ringSvg)}`;

  const rows: WeeklyMetric[][] = [
    [metrics[0], metrics[1]],
    [metrics[2], metrics[3]],
    [metrics[4], metrics[5]],
  ];

  // Every Satori node needs an explicit display; text leaves use flex too.
  const col = { display: "flex", flexDirection: "column" } as const;
  const rowCenter = { display: "flex", alignItems: "center" } as const;

  return new ImageResponse(
    (
      <div
        style={{
          ...col,
          width: W,
          height: H,
          justifyContent: "space-between",
          padding: "84px 72px 76px",
          background: `linear-gradient(155deg, ${COLORS.bg0} 0%, ${COLORS.bg1} 52%, ${COLORS.bg0} 100%)`,
          color: COLORS.fg,
          fontFamily: "Instrument Serif",
        }}
      >
        {/* top accent line */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            width: W,
            height: 8,
            background: ringColor,
          }}
        />

        {/* header */}
        <div style={{ ...rowCenter, justifyContent: "space-between" }}>
          <div style={rowCenter}>
            <div
              style={{
                display: "flex",
                width: 18,
                height: 18,
                borderRadius: 9999,
                background: ringColor,
                marginRight: 18,
              }}
            />
            <div style={{ display: "flex", fontFamily: "Anton", fontSize: 38, letterSpacing: 8, color: COLORS.fg }}>
              PORTION
            </div>
          </div>
          <div style={{ display: "flex", fontStyle: "italic", fontSize: 34, color: COLORS.muted }}>{weekLabel}</div>
        </div>

        {/* hero: ring + headline */}
        <div style={{ ...col, alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              position: "relative",
              alignItems: "center",
              justifyContent: "center",
              width: 460,
              height: 460,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ringSrc} width={460} height={460} alt="" />
            <div style={{ ...col, position: "absolute", alignItems: "center" }}>
              <div style={{ display: "flex", fontFamily: "Anton", fontSize: 188, lineHeight: 1, color: ringColor }}>
                {judged > 0 ? String(good) : "—"}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 30,
                  letterSpacing: 3,
                  color: COLORS.muted,
                  marginTop: 6,
                  textTransform: "uppercase",
                }}
              >
                {judged > 0 ? `of ${judged} fronts` : "no data yet"}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontStyle: "italic",
              fontSize: 50,
              lineHeight: 1.18,
              textAlign: "center",
              color: "#e7e7ea",
              maxWidth: 840,
              marginTop: 30,
            }}
          >
            {headline}
          </div>
        </div>

        {/* metric grid */}
        <div style={{ ...col, gap: 20 }}>
          {rows.map((row, i) => (
            <div key={i} style={{ display: "flex", gap: 20 }}>
              {row.map((m) => (
                <div
                  key={m.key}
                  style={{
                    ...col,
                    flex: 1,
                    padding: "26px 30px",
                    borderRadius: 28,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.cardBorder}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: 26,
                      letterSpacing: 2,
                      color: COLORS.muted,
                      textTransform: "uppercase",
                    }}
                  >
                    {m.label}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 8 }}>
                    <div style={{ display: "flex", fontFamily: "Anton", fontSize: 58, lineHeight: 1, color: COLORS.fg }}>
                      {m.value}
                    </div>
                    <div style={{ display: "flex", fontSize: 30, color: deltaColor(m.good), marginLeft: 12 }}>
                      {m.delta ?? ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* footer */}
        <div style={{ ...rowCenter, justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontStyle: "italic", fontSize: 32, color: COLORS.muted }}>
            {firstName ? `${firstName}'s week` : "Tracked on Portion"}
          </div>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 32, letterSpacing: 3, color: COLORS.fg }}>
            portion.app
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: { "Cache-Control": "private, no-store" },
      fonts: [
        { name: "Anton", data: fonts.anton, weight: 400, style: "normal" },
        { name: "Instrument Serif", data: fonts.serif, weight: 400, style: "normal" },
        { name: "Instrument Serif", data: fonts.serifItalic, weight: 400, style: "italic" },
      ],
    },
  );
}
