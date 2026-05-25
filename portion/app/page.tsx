"use client";

import Link from "next/link";
import { useRef } from "react";
import { Bebas_Neue, DM_Mono, DM_Sans } from "next/font/google";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
} from "framer-motion";
import { ArrowRight, Dumbbell, TrendingUp, Target } from "lucide-react";

const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-dm-mono" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

const EASE = [0.16, 1, 0.3, 1] as const;
const LIME = "#C8FF00";

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), { stiffness: 150, damping: 20 });
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <div
      className={`${bebas.variable} ${dmMono.variable} ${dmSans.variable} relative min-h-screen overflow-x-hidden bg-[#070707] text-[#F0EFE8]`}
      style={{ fontFamily: "var(--font-dm-sans)" }}
    >
      {/* Grid texture */}
      <div
        className="pointer-events-none fixed inset-0 -z-20 opacity-[0.022]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(240,239,232,1) 1px,transparent 1px),linear-gradient(90deg,rgba(240,239,232,1) 1px,transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-48 left-1/3 h-[720px] w-[720px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(200,255,0,0.07) 0%, transparent 65%)" }}
          animate={{ x: [0, 100, -50, 0], y: [0, 60, -30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(200,255,0,0.04) 0%, transparent 65%)" }}
          animate={{ x: [0, -70, 50, 0], y: [0, -50, 60, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative z-20 flex items-center justify-between px-8 py-6 sm:px-12"
      >
        <div className="flex items-center gap-3">
          <div
            className="h-2.5 w-2.5"
            style={{ background: LIME, boxShadow: `0 0 24px rgba(200,255,0,0.6)` }}
          />
          <span
            className="text-[22px] tracking-[0.18em]"
            style={{ fontFamily: "var(--font-bebas)" }}
          >
            PORTION
          </span>
        </div>
        <Link
          href="/auth/login"
          className="text-sm text-[#F0EFE8]/40 transition hover:text-[#F0EFE8]/80"
        >
          Sign in
        </Link>
      </motion.header>

      {/* ── Hero ── */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative z-10 mx-auto max-w-7xl px-8 pb-24 pt-10 sm:px-12 sm:pt-14"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-8 inline-flex items-center gap-2.5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-widest"
          style={{ border: `1px solid rgba(200,255,0,0.28)`, color: LIME, background: "rgba(200,255,0,0.05)" }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ background: LIME }}
            />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: LIME }} />
          </span>
          Built for the ones who do both
        </motion.div>

        {/* Headline: slides up */}
        <div className="overflow-hidden">
          <motion.div
            initial={{ y: "105%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 0.85, ease: EASE, delay: 0.12 }}
            className="block leading-[0.87]"
            style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(56px, 12vw, 148px)" }}
          >
            YOU&apos;RE GOING
          </motion.div>
        </div>
        <div className="overflow-hidden">
          <motion.div
            initial={{ y: "105%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 0.85, ease: EASE, delay: 0.22 }}
            className="block leading-[0.87]"
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "clamp(56px, 12vw, 148px)",
              color: LIME,
              textShadow: `0 0 80px rgba(200,255,0,0.22)`,
            }}
          >
            ALL IN.
          </motion.div>
        </div>

        {/* Sub + CTA */}
        <div className="mt-10 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.38 }}
            className="max-w-sm text-base leading-relaxed text-[#F0EFE8]/50"
          >
            The only tracker built for both. Train your body, build your income —
            one place, nothing slipping through the cracks.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.48 }}
            className="flex flex-col gap-2 sm:items-end"
          >
            <Link
              href="/onboarding"
              className="group inline-flex items-center gap-2.5 px-8 py-4 text-sm font-semibold text-[#070707] transition-transform hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: LIME }}
            >
              Start Building
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/auth/login" className="text-xs text-[#F0EFE8]/35">
              Already have an account
            </Link>
          </motion.div>
        </div>

        {/* Accent divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.0, ease: EASE, delay: 0.55 }}
          className="mt-14 h-px origin-left"
          style={{ background: `linear-gradient(90deg, rgba(200,255,0,0.65), rgba(240,239,232,0.05) 55%, transparent)` }}
        />

        {/* 3D Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 0.65 }}
          onMouseMove={onMouseMove}
          onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
          className="relative mt-12 w-full max-w-5xl"
          style={{ perspective: 1600 }}
        >
          <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
            <div
              className="p-[1px]"
              style={{
                background: `linear-gradient(130deg, rgba(200,255,0,0.25) 0%, rgba(240,239,232,0.06) 40%, transparent 100%)`,
                boxShadow: "0 40px 160px -20px rgba(0,0,0,0.95)",
              }}
            >
              <div className="bg-[#0C0C0A]">
                <DashboardMockup />
              </div>
            </div>
          </motion.div>
          <div
            className="pointer-events-none absolute -bottom-14 left-1/2 h-36 w-3/4 -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: "rgba(200,255,0,0.05)" }}
          />
        </motion.div>
      </motion.section>

      {/* ── Ticker ── */}
      <Marquee />

      {/* ── Pillars + Stats + CTA ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-8 pb-32 pt-20 sm:px-12">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false, amount: 0.5 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mb-14 max-w-lg text-sm leading-relaxed text-[#F0EFE8]/45"
        >
          You have the discipline. What you don&apos;t have is one place to see it all working.
        </motion.p>

        {/* Pillar cards */}
        <div className="grid gap-px sm:grid-cols-2" style={{ background: "rgba(240,239,232,0.05)" }}>
          <PillarCard
            index={0}
            icon={<Dumbbell className="h-5 w-5" />}
            label="HEALTH"
            title="Train like it counts."
            body="Log every session. Sets, reps, weight, calisthenics holds, run splits. Hit your macros. Watch your body move toward the goal — with data, not hope."
            stats={[
              { label: "Sessions", value: "184" },
              { label: "Accuracy", value: "92%" },
              { label: "Days left", value: "47" },
            ]}
          />
          <PillarCard
            index={1}
            icon={<TrendingUp className="h-5 w-5" />}
            label="MONEY"
            title="Build like it compounds."
            body="Whatever you're building — brand, business, pipeline, skill — log it every day. Revenue, reach, deals closed, hours of deep work. Numbers don't lie."
            stats={[
              { label: "Revenue", value: "€2.1k" },
              { label: "On track", value: "6/8" },
              { label: "Streak", value: "47d" },
            ]}
          />
        </div>

        {/* Stats strip */}
        <div className="mt-px grid grid-cols-2 gap-px sm:grid-cols-4" style={{ background: "rgba(240,239,232,0.05)" }}>
          {[
            { n: "184", label: "Sessions logged" },
            { n: "47", label: "Day streak" },
            { n: "€2.1k", label: "Monthly revenue" },
            { n: "6/8", label: "Goals on track" },
          ].map((item, i) => (
            <motion.div
              key={item.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.4 }}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.07 }}
              className="bg-[#070707] px-7 py-8"
            >
              <div
                className="text-[40px] font-medium leading-none"
                style={{ fontFamily: "var(--font-dm-mono)", color: LIME }}
              >
                {item.n}
              </div>
              <div className="mt-2.5 text-[11px] uppercase tracking-widest text-[#F0EFE8]/35">
                {item.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.25 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mt-px bg-[#070707] px-10 py-16 sm:px-16 sm:py-20"
          style={{ border: "1px solid rgba(200,255,0,0.08)" }}
        >
          <div
            className="leading-[0.88]"
            style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(40px, 8vw, 96px)" }}
          >
            STOP HOPING.
            <br />
            <span style={{ color: LIME }}>START TRACKING.</span>
          </div>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-[#F0EFE8]/45">
            One year from now you&apos;ll wish you started today. Don&apos;t be that guy.
          </p>
          <Link
            href="/onboarding"
            className="group mt-10 inline-flex items-center gap-2.5 px-8 py-4 text-sm font-semibold text-[#070707] transition-transform hover:scale-[1.03] active:scale-[0.97]"
            style={{ background: LIME }}
          >
            Start Building
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#F0EFE8]/5 px-8 py-8 text-xs text-[#F0EFE8]/25 sm:px-12">
        Portion · built for the ones who do both
      </footer>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div style={{ fontFamily: "var(--font-dm-sans)" }}>
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-[#F0EFE8]/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-[#F0EFE8]/10" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#F0EFE8]/10" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#F0EFE8]/10" />
        </div>
        <div
          className="text-[10px] uppercase tracking-widest text-[#F0EFE8]/30"
          style={{ fontFamily: "var(--font-dm-mono)" }}
        >
          portion · dashboard
        </div>
        <div className="text-[10px] text-[#F0EFE8]/30" style={{ fontFamily: "var(--font-dm-mono)" }}>
          Today
        </div>
      </div>

      <div className="grid grid-cols-12 gap-[1px]" style={{ background: "rgba(240,239,232,0.04)" }}>
        {/* Health */}
        <div className="col-span-12 bg-[#0C0C0A] p-5 sm:col-span-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#F0EFE8]/50">
              <Dumbbell className="h-3.5 w-3.5" /> Health
            </div>
            <div className="text-[10px] text-[#F0EFE8]/30" style={{ fontFamily: "var(--font-dm-mono)" }}>
              Push · Day 47/120
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#F0EFE8]/35">Body weight</div>
                <div className="mt-1 text-2xl font-semibold" style={{ fontFamily: "var(--font-dm-mono)" }}>
                  71.4 kg
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-[#F0EFE8]/35">Target</div>
                <div className="mt-1 text-sm" style={{ fontFamily: "var(--font-dm-mono)", color: LIME }}>
                  68.0 kg · Jul 4
                </div>
              </div>
            </div>

            <svg viewBox="0 0 300 60" className="mt-3 h-14 w-full">
              <defs>
                <linearGradient id="wg2" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={LIME} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={LIME} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,16 C40,22 70,14 100,26 C130,38 160,34 190,40 C220,46 250,43 300,50"
                stroke={LIME} strokeWidth="1.5" fill="none" strokeOpacity="0.75"
              />
              <path
                d="M0,16 C40,22 70,14 100,26 C130,38 160,34 190,40 C220,46 250,43 300,50 L300,60 L0,60 Z"
                fill="url(#wg2)"
              />
            </svg>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Protein", value: 142, target: 180 },
              { label: "Carbs", value: 218, target: 280 },
              { label: "Calories", value: 1840, target: 2400 },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex items-baseline justify-between">
                  <div className="text-[10px] uppercase tracking-wider text-[#F0EFE8]/35">{m.label}</div>
                  <div className="text-[10px] text-[#F0EFE8]/50" style={{ fontFamily: "var(--font-dm-mono)" }}>
                    {m.value}/{m.target}
                  </div>
                </div>
                <div className="mt-1.5 h-1 bg-[#F0EFE8]/5">
                  <div
                    className="h-full"
                    style={{
                      width: `${(m.value / m.target) * 100}%`,
                      background: `linear-gradient(90deg, ${LIME}, rgba(200,255,0,0.55))`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Money */}
        <div className="col-span-12 bg-[#0C0C0A] p-5 sm:col-span-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#F0EFE8]/50">
              <TrendingUp className="h-3.5 w-3.5" /> Money
            </div>
            <div className="text-[10px] text-[#F0EFE8]/30" style={{ fontFamily: "var(--font-dm-mono)" }}>
              This month
            </div>
          </div>

          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-wider text-[#F0EFE8]/35">Revenue</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-dm-mono)", color: LIME }}>
                €2,140
              </div>
              <div className="text-xs text-[#F0EFE8]/40" style={{ fontFamily: "var(--font-dm-mono)" }}>
                / €3,000
              </div>
            </div>
            <div className="mt-2 h-1 bg-[#F0EFE8]/5">
              <div className="h-full w-[71%]" style={{ background: `linear-gradient(90deg, ${LIME}, rgba(200,255,0,0.55))` }} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-[1px]" style={{ background: "rgba(240,239,232,0.05)" }}>
            {[
              { label: "Deep work", value: "18h" },
              { label: "Calls / wk", value: "9" },
              { label: "Audience", value: "8.2k" },
              { label: "Growth", value: "+11%" },
            ].map((s) => (
              <div key={s.label} className="bg-[#0C0C0A] px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-[#F0EFE8]/30">{s.label}</div>
                <div className="mt-0.5 text-sm font-medium" style={{ fontFamily: "var(--font-dm-mono)" }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="col-span-12 bg-[#0C0C0A] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#F0EFE8]/50">
              <Target className="h-3.5 w-3.5" /> Today
            </div>
            <div className="text-[10px]" style={{ fontFamily: "var(--font-dm-mono)", color: LIME }}>
              4 / 6 done
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Push session · 60 min", done: true },
              { label: "Hit 180g protein", done: true },
              { label: "Ship 1 piece of content", done: true },
              { label: "Deep work · 2h", done: true },
              { label: "Cold shower", done: false },
              { label: "Reply to DMs", done: false },
            ].map((t) => (
              <div
                key={t.label}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px]"
                style={{
                  border: t.done ? `1px solid rgba(200,255,0,0.30)` : "1px solid rgba(240,239,232,0.08)",
                  background: t.done ? "rgba(200,255,0,0.07)" : "transparent",
                  color: t.done ? "#F0EFE8" : "rgba(240,239,232,0.35)",
                  fontFamily: "var(--font-dm-mono)",
                }}
              >
                <span
                  className="flex h-3 w-3 items-center justify-center"
                  style={{
                    background: t.done ? LIME : "transparent",
                    border: t.done ? "none" : "1px solid rgba(240,239,232,0.18)",
                  }}
                >
                  {t.done && <span className="text-[8px] font-bold text-[#070707]">✓</span>}
                </span>
                {t.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Marquee() {
  const words = [
    "DISCIPLINE", "CONSISTENCY", "COMPOUND", "ALL IN",
    "SHOW UP", "BUILD", "TRACK IT", "NO EXCUSES", "EVERY DAY", "LEVELS",
  ];
  const loop = [...words, ...words, ...words];
  return (
    <div
      className="relative z-10 py-5"
      style={{
        borderTop: "1px solid rgba(240,239,232,0.06)",
        borderBottom: "1px solid rgba(240,239,232,0.06)",
        background: "rgba(0,0,0,0.45)",
      }}
    >
      <div
        className="flex overflow-hidden"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        }}
      >
        <motion.div
          className="flex shrink-0 gap-10 pr-10"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 35, ease: "linear", repeat: Infinity }}
        >
          {loop.map((w, i) => (
            <span
              key={i}
              className="flex shrink-0 items-center gap-10"
              style={{
                fontFamily: "var(--font-bebas)",
                fontSize: "clamp(18px, 2.5vw, 26px)",
                letterSpacing: "0.08em",
                color: "rgba(240,239,232,0.22)",
              }}
            >
              {w}
              <span className="h-1.5 w-1.5 shrink-0" style={{ background: LIME }} />
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function PillarCard({
  icon,
  label,
  title,
  body,
  stats,
  index,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  body: string;
  stats: { label: string; value: string }[];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ duration: 0.6, ease: EASE, delay: index * 0.08 }}
      className="group relative overflow-hidden bg-[#070707] p-8"
    >
      {/* Lime top-line reveal on hover */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
        style={{ background: LIME }}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-xs text-[#F0EFE8]/45">
          {icon}
          <span className="text-[14px] tracking-[0.12em]" style={{ fontFamily: "var(--font-bebas)" }}>
            {label}
          </span>
        </div>
        <div className="h-px w-8 bg-[#F0EFE8]/10" />
      </div>

      <h3 className="mt-5 text-xl font-semibold leading-tight tracking-tight">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[#F0EFE8]/50">{body}</p>

      <div className="mt-7 grid grid-cols-3 gap-4 border-t border-[#F0EFE8]/5 pt-6">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.2 + i * 0.07 }}
          >
            <div className="text-[10px] uppercase tracking-widest text-[#F0EFE8]/30">{s.label}</div>
            <div className="mt-1 text-xl font-medium" style={{ fontFamily: "var(--font-dm-mono)", color: LIME }}>
              {s.value}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
