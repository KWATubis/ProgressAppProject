"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
} from "framer-motion";
import { ArrowRight, Dumbbell, TrendingUp, Target } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease, delay: i * 0.08 },
  }),
};

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), {
    stiffness: 150,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), {
    stiffness: 150,
    damping: 20,
  });

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.08),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.05),transparent_50%),radial-gradient(circle_at_50%_90%,rgba(255,255,255,0.06),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:48px_48px]" />
        <motion.div
          className="absolute -top-32 left-1/4 h-[520px] w-[520px] rounded-full bg-white/[0.07] blur-[120px]"
          animate={{ x: [0, 60, -40, 0], y: [0, 40, -20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-white/[0.05] blur-[110px]"
          animate={{ x: [0, -80, 40, 0], y: [0, -30, 50, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="relative z-20 flex items-center justify-between px-6 py-5 sm:px-10"
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.8)]" />
          <span className="text-lg font-semibold tracking-tight">Portion</span>
        </div>
        <Link
          href="/auth/login"
          className="text-sm font-medium text-white/60 transition hover:text-white"
        >
          Sign in
        </Link>
      </motion.header>

      {/* Hero */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-6 pb-24 pt-16 sm:px-10 sm:pt-24"
      >
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-white/70 backdrop-blur"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          Built for the ones who do both
        </motion.div>

        <h1 className="max-w-4xl text-center text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
          <motion.span variants={fadeUp} initial="hidden" animate="show" custom={1} className="block">
            You&apos;re going all in
          </motion.span>
          <motion.span variants={fadeUp} initial="hidden" animate="show" custom={2} className="block">
            on your body{" "}
            <span className="bg-gradient-to-b from-white/70 to-white/30 bg-clip-text text-transparent">
              and your bag.
            </span>
          </motion.span>
        </h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
          className="mt-7 max-w-xl text-center text-base text-white/60 sm:text-lg"
        >
          The only tracker built for both. Gym sessions, macros, follower count, income —
          one place, nothing slipping through the cracks.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={4}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link
            href="/onboarding"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white via-white/60 to-white transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative">Start Building</span>
            <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/auth/login"
            className="text-sm font-medium text-white/60 transition hover:text-white"
          >
            I already have an account
          </Link>
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={5}
          onMouseMove={onMouseMove}
          onMouseLeave={() => {
            mouseX.set(0);
            mouseY.set(0);
          }}
          className="relative mt-20 w-full max-w-5xl"
          style={{ perspective: 1600 }}
        >
          <motion.div
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-2 shadow-[0_30px_120px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          >
            <DashboardMockup />
          </motion.div>
          <div className="pointer-events-none absolute -bottom-10 left-1/2 h-32 w-3/4 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        </motion.div>
      </motion.section>

      {/* Marquee */}
      <Marquee />

      {/* Pillars */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-28 sm:px-10">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.7, ease }}
          className="mx-auto max-w-xl text-center text-base text-white/60"
        >
          You have the discipline. What you don&apos;t have is one place to see it all working.
        </motion.p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          <Pillar
            icon={<Dumbbell className="h-5 w-5" />}
            title="Train like it counts."
            body="Log every session. Track sets, reps, weight, calisthenics holds, run splits. Hit your macro targets. Watch your body move toward the goal — with data, not hope."
            stats={[
              { label: "Sessions logged", value: "184" },
              { label: "Macro accuracy", value: "92%" },
              { label: "Days to goal", value: "47" },
            ]}
          />
          <Pillar
            icon={<TrendingUp className="h-5 w-5" />}
            title="Build like it compounds."
            body="Log your TikTok growth, income by source, monthly targets. The brand and the bag — side by side, every single day."
            stats={[
              { label: "Followers", value: "8.2k" },
              { label: "Monthly revenue", value: "€2.1k" },
              { label: "Growth rate", value: "+11%" },
            ]}
          />
        </div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease }}
          className="mt-24 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent p-12 text-center sm:p-16"
        >
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
            Stop hoping. Start tracking.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base text-white/60">
            One year from now you&apos;ll wish you started today. Don&apos;t be that guy.
          </p>
          <Link
            href="/onboarding"
            className="group mt-10 inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-8 py-4 text-sm font-semibold text-black transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Start Building</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-white/5 px-6 py-8 text-center text-xs text-white/40 sm:px-10">
        Portion · built for the ones who do both
      </footer>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c0c0c]">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </div>
        <div className="text-[10px] uppercase tracking-widest text-white/40">
          portion · dashboard
        </div>
        <div className="text-[10px] text-white/40">Today</div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-12 gap-3 p-4">
        {/* Pillar: Health */}
        <div className="col-span-12 rounded-lg border border-white/10 bg-white/[0.02] p-4 sm:col-span-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <Dumbbell className="h-3.5 w-3.5" />
              Health
            </div>
            <div className="text-[10px] text-white/40">Push · Day 47/120</div>
          </div>

          {/* Weight progress chart */}
          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40">Body weight</div>
                <div className="mt-1 text-2xl font-semibold">71.4 kg</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-white/40">Target</div>
                <div className="mt-1 text-sm text-white/70">68.0 kg · Jul 4</div>
              </div>
            </div>

            <svg viewBox="0 0 300 80" className="mt-3 h-20 w-full">
              <defs>
                <linearGradient id="weightGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
              </defs>
              <path
                d="M0,20 C40,28 70,18 100,32 C130,46 160,42 190,50 C220,58 250,55 300,62"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M0,20 C40,28 70,18 100,32 C130,46 160,42 190,50 C220,58 250,55 300,62 L300,80 L0,80 Z"
                fill="url(#weightGrad)"
              />
            </svg>
          </div>

          {/* Macro bars */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Protein", value: 142, target: 180, suffix: "g" },
              { label: "Carbs", value: 218, target: 280, suffix: "g" },
              { label: "Calories", value: 1840, target: 2400, suffix: "" },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex items-baseline justify-between">
                  <div className="text-[10px] uppercase tracking-wider text-white/40">{m.label}</div>
                  <div className="text-[10px] text-white/60">
                    {m.value}/{m.target}{m.suffix}
                  </div>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-white/80 to-white/40"
                    style={{ width: `${(m.value / m.target) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pillar: Money */}
        <div className="col-span-12 rounded-lg border border-white/10 bg-white/[0.02] p-4 sm:col-span-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <TrendingUp className="h-3.5 w-3.5" />
              Money
            </div>
            <div className="text-[10px] text-white/40">This week</div>
          </div>

          {/* TikTok */}
          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              TikTok @bubis
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-2xl font-semibold">8,247</div>
              <div className="text-xs text-white/50">/ 10,000</div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-white to-white/40" />
            </div>
          </div>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Stat label="Posts / wk" value="6" />
            <Stat label="Avg views" value="14.2k" />
            <Stat label="Revenue" value="€2.1k" />
            <Stat label="Growth" value="+11%" />
          </div>
        </div>

        {/* Today's tasks strip */}
        <div className="col-span-12 rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <Target className="h-3.5 w-3.5" />
              Today
            </div>
            <div className="text-[10px] text-white/40">4 of 6 done</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Push session · 60 min", done: true },
              { label: "Hit 180g protein", done: true },
              { label: "Post 1 TikTok", done: true },
              { label: "Read 20 min", done: true },
              { label: "Cold shower", done: false },
              { label: "Reply to DMs", done: false },
            ].map((t) => (
              <div
                key={t.label}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
                  t.done
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-white/10 bg-transparent text-white/40"
                }`}
              >
                <span
                  className={`flex h-3 w-3 items-center justify-center rounded-full ${
                    t.done ? "bg-white" : "border border-white/20"
                  }`}
                >
                  {t.done && <span className="text-[8px] font-bold text-black">✓</span>}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/5 bg-white/[0.02] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

function Marquee() {
  const words = [
    "DISCIPLINE",
    "CONSISTENCY",
    "COMPOUND",
    "ALL IN",
    "SHOW UP",
    "BUILD",
    "TRACK IT",
    "NO EXCUSES",
    "EVERY DAY",
    "LEVELS",
  ];
  const loop = [...words, ...words, ...words];
  return (
    <div className="relative z-10 border-y border-white/5 bg-black/40 py-6 backdrop-blur">
      <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
        <motion.div
          className="flex shrink-0 gap-12 pr-12"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 40, ease: "linear", repeat: Infinity }}
        >
          {loop.map((w, i) => (
            <span
              key={i}
              className="flex shrink-0 items-center gap-12 text-2xl font-semibold tracking-tight text-white/30 sm:text-3xl"
            >
              {w}
              <span className="h-1 w-1 rounded-full bg-white/30" />
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function Pillar({
  icon,
  title,
  body,
  stats,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  stats: { label: string; value: string }[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-7"
    >
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
        {icon}
      </div>
      <h3 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/60">{body}</p>
      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/5 pt-5">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-[10px] uppercase tracking-wider text-white/40">{s.label}</div>
            <div className="mt-1 text-lg font-semibold">{s.value}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

