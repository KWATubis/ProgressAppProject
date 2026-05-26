"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Anton, Instrument_Serif, Geist, Geist_Mono } from "next/font/google";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useInView,
  animate,
} from "framer-motion";
import { ArrowRight, Dumbbell, TrendingUp, Target, Check, X } from "lucide-react";

const display = Anton({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const serif = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-serif" });
const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

const EASE = [0.16, 1, 0.3, 1] as const;

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { stiffness: 140, damping: 22 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-9, 9]), { stiffness: 140, damping: 22 });
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <div
      className={`${display.variable} ${serif.variable} ${sans.variable} ${mono.variable} relative min-h-screen overflow-x-hidden bg-[#070707] text-white`}
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* Subtle grid */}
      <div
        className="pointer-events-none fixed inset-0 -z-20 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      {/* Film grain */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-48 left-1/3 h-[720px] w-[720px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.055) 0%, transparent 65%)" }}
          animate={{ x: [0, 100, -50, 0], y: [0, 60, -30, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 65%)" }}
          animate={{ x: [0, -70, 50, 0], y: [0, -50, 60, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative z-20 flex items-center justify-between px-8 py-6 sm:px-12"
      >
        <div className="flex items-center gap-3">
          <div
            className="h-2.5 w-2.5 bg-white"
            style={{ boxShadow: "0 0 22px rgba(255,255,255,0.75)" }}
          />
          <span
            className="text-[26px] leading-none tracking-[0.18em] text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            PORTION
          </span>
        </div>
        <Link
          href="/auth/login"
          className="text-sm text-white/40 transition hover:text-white/85"
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
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.6 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-9 inline-flex items-center gap-2.5 border border-white/15 bg-white/[0.04] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white/55"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          For the ones locking in
        </motion.div>

        {/* Headline — Anton hammer + Instrument Serif italic accent */}
        <h1 className="select-none">
          <SplitReveal delay={0.08}>
            <span
              className="block leading-[0.88] tracking-[-0.005em] text-white"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(46px, 9vw, 118px)" }}
            >
              TRAIN HARD.
            </span>
          </SplitReveal>
          <div className="overflow-hidden">
            <motion.span
              initial={{ y: "105%", opacity: 0 }}
              whileInView={{ y: "0%", opacity: 1 }}
              viewport={{ once: false, amount: 0.4 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.32 }}
              className="block leading-[0.95] text-white/90"
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: "clamp(40px, 7.8vw, 102px)",
                letterSpacing: "-0.01em",
              }}
            >
              earn hard.
            </motion.span>
          </div>
        </h1>

        {/* Sub + CTA */}
        <div className="mt-12 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.6 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.5 }}
            className="max-w-md text-[15px] leading-relaxed text-white/55"
          >
            Body. Bag. Brain. One screen. No more six notes apps, three trackers
            and a vibe. Log it, see it, move.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.6 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.6 }}
            className="flex flex-col gap-2 sm:items-end"
          >
            <MagneticCTA href="/onboarding">Start Locking In</MagneticCTA>
            <Link href="/auth/login" className="text-xs text-white/30">
              Already have an account
            </Link>
          </motion.div>
        </div>

        {/* Accent divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: false, amount: 0.6 }}
          transition={{ duration: 1, ease: EASE, delay: 0.65 }}
          className="mt-14 h-px origin-left"
          style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.55), rgba(255,255,255,0.04) 55%, transparent)" }}
        />

        {/* 3D Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 1, ease: EASE, delay: 0.2 }}
          onMouseMove={onMouseMove}
          onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
          className="relative mt-12 w-full max-w-5xl"
          style={{ perspective: 1600 }}
        >
          <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
            <div
              className="p-[1px]"
              style={{
                background: "linear-gradient(130deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.05) 40%, transparent 100%)",
                boxShadow: "0 40px 160px -20px rgba(0,0,0,0.97)",
              }}
            >
              <div className="bg-[#0C0C0A]">
                <DashboardMockup />
              </div>
            </div>
          </motion.div>
          <div
            className="pointer-events-none absolute -bottom-14 left-1/2 h-36 w-3/4 -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: "rgba(255,255,255,0.04)" }}
          />
        </motion.div>
      </motion.section>

      {/* ── Ticker ── */}
      <Marquee />

      {/* ── Stat strip with animated counters ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-8 pt-24 sm:px-12">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false, amount: 0.5 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mb-12 max-w-xl text-[15px] leading-relaxed text-white/45"
        >
          You&apos;re juggling the gym, the content, the side hustle, the grades.
          Six apps, zero clarity, most days you don&apos;t even know if you moved.
        </motion.p>

        <div className="grid grid-cols-2 gap-px sm:grid-cols-4" style={{ background: "rgba(255,255,255,0.06)" }}>
          <Counter value={184} suffix="" label="Sessions logged" />
          <Counter value={47} suffix="d" label="Day streak" />
          <Counter value={2.1} suffix="k €" decimals={1} label="Tracked this month" />
          <Counter value={8} max={10} label="Goals on track" format="ratio" />
        </div>
      </section>

      {/* ── Talks vs Does ── */}
      <section className="relative z-10 mx-auto mt-24 max-w-7xl px-8 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.4 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-10 flex items-end justify-between"
        >
          <div>
            <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-white/35">Two guys. Same age.</div>
            <h2
              className="leading-[0.92] text-white"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 5.2vw, 64px)" }}
            >
              ONE TALKS. <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "rgba(255,255,255,0.85)" }}>one</span> SHIPS.
            </h2>
          </div>
        </motion.div>

        <div className="grid gap-px sm:grid-cols-2" style={{ background: "rgba(255,255,255,0.06)" }}>
          <VsColumn
            tone="bad"
            header="GUY WHO TALKS"
            sub="His phone has six apps, his head has six excuses."
            items={[
              "Starts Monday. Every Monday.",
              "Eats clean — when someone's watching.",
              "Six notes apps, zero progress.",
              "Tracks calories one week per quarter.",
              "Has a vision board. Not much else.",
            ]}
          />
          <VsColumn
            tone="good"
            header="GUY WHO SHIPS"
            sub="His phone has one app. His feed has nothing on him."
            items={[
              "Started Tuesday. Hasn't stopped.",
              "Hits 180g protein. Every day.",
              "One screen. Body, money, brain.",
              "47-day streak. Knows it cold.",
              "Sees the gap shrink in real numbers.",
            ]}
          />
        </div>
      </section>

      {/* ── Pillars ── */}
      <section className="relative z-10 mx-auto mt-24 max-w-7xl px-8 pb-12 sm:px-12">
        <div className="grid gap-px sm:grid-cols-2" style={{ background: "rgba(255,255,255,0.06)" }}>
          <PillarCard
            index={0}
            icon={<Dumbbell className="h-5 w-5" />}
            label="HEALTH"
            title="Train it. Feed it. Watch it change."
            body="Every session. Every set. Every gram of protein. Body weight, lifts, runs, holds — the work shows up on the screen so you stop guessing if it&apos;s working."
            stats={[
              { label: "Sessions", value: "184" },
              { label: "PRs hit", value: "12" },
              { label: "Days left", value: "47" },
            ]}
          />
          <PillarCard
            index={1}
            icon={<TrendingUp className="h-5 w-5" />}
            label="MONEY"
            title="Build it. Sell it. Count it."
            body="Whatever you&apos;re cooking — brand, business, pipeline, skill. Revenue, reach, deep work, deals closed. Log it daily. Numbers don&apos;t cope."
            stats={[
              { label: "Tracked", value: "€2.1k" },
              { label: "On track", value: "6/8" },
              { label: "Streak", value: "47d" },
            ]}
          />
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-10 mx-auto mt-24 max-w-7xl px-8 pb-32 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.25 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative overflow-hidden bg-[#0A0A0A] px-10 py-20 sm:px-16 sm:py-24"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* Subtle radial */}
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              background: "radial-gradient(800px 400px at 80% 20%, rgba(255,255,255,0.06), transparent 70%)",
            }}
          />

          <div className="relative">
            <div
              className="leading-[0.9] text-white"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px, 6.4vw, 82px)" }}
            >
              YOUR 25-YEAR-OLD SELF
              <br />
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  color: "rgba(255,255,255,0.92)",
                  fontSize: "clamp(32px, 6vw, 78px)",
                }}
              >
                is watching.
              </span>
            </div>
            <p className="mt-7 max-w-md text-[15px] leading-relaxed text-white/45">
              One year from now you&apos;ll wish you started today. Don&apos;t be that guy.
              Be the one in the mirror you keep promising you&apos;ll become.
            </p>
            <div className="mt-10">
              <MagneticCTA href="/onboarding">Start Locking In</MagneticCTA>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-8 text-xs text-white/20 sm:px-12">
        Portion · built for the ones who do both
      </footer>
    </div>
  );
}

/* ───────────────────────── Helpers ───────────────────────── */

function SplitReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div className="overflow-hidden">
      <motion.div
        initial={{ y: "105%" }}
        whileInView={{ y: "0%" }}
        viewport={{ once: false, amount: 0.4 }}
        transition={{ duration: 0.95, ease: EASE, delay }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function MagneticCTA({ href, children }: { href: string; children: React.ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useSpring(0, { stiffness: 220, damping: 18 });
  const y = useSpring(0, { stiffness: 220, damping: 18 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) * 0.25;
    const dy = (e.clientY - cy) * 0.25;
    x.set(dx);
    y.set(dy);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.a
      ref={ref}
      href={href}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x, y }}
      className="group relative inline-flex items-center gap-2.5 overflow-hidden bg-white px-9 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#080808]"
    >
      <span
        className="absolute inset-0 -translate-x-full bg-white/40 transition-transform duration-500 group-hover:translate-x-0"
        style={{ mixBlendMode: "screen" }}
      />
      <span className="relative">{children}</span>
      <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" />
    </motion.a>
  );
}

function Counter({
  value,
  suffix = "",
  label,
  decimals = 0,
  max,
  format,
}: {
  value: number;
  suffix?: string;
  label: string;
  decimals?: number;
  max?: number;
  format?: "ratio";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.6 });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) {
      setN(0);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setN(v),
    });
    return () => controls.stop();
  }, [inView, value]);

  const display = format === "ratio" && max
    ? `${Math.round(n)}/${max}`
    : `${n.toFixed(decimals)}${suffix}`;

  return (
    <div ref={ref} className="bg-[#070707] px-7 py-9">
      <div
        className="text-[44px] leading-none text-white"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {display}
      </div>
      <div className="mt-3 text-[11px] uppercase tracking-[0.22em] text-white/35">
        {label}
      </div>
    </div>
  );
}

function VsColumn({
  tone,
  header,
  sub,
  items,
}: {
  tone: "good" | "bad";
  header: string;
  sub: string;
  items: string[];
}) {
  const good = tone === "good";
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ duration: 0.65, ease: EASE }}
      className="group relative overflow-hidden bg-[#070707] p-8 sm:p-10"
    >
      <div className={`absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100 ${good ? "bg-white" : "bg-white/20"}`} />

      <div className="mb-6 flex items-center justify-between">
        <div
          className="text-xl tracking-[0.06em] text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {header}
        </div>
        <div className={`flex h-7 w-7 items-center justify-center ${good ? "bg-white text-[#080808]" : "border border-white/15 text-white/35"}`}>
          {good ? <Check className="h-4 w-4" strokeWidth={3} /> : <X className="h-4 w-4" strokeWidth={2.4} />}
        </div>
      </div>
      <p className={`mb-7 text-sm leading-relaxed ${good ? "text-white/65" : "text-white/35"}`}>{sub}</p>

      <ul className="space-y-3">
        {items.map((t, i) => (
          <motion.li
            key={t}
            initial={{ opacity: 0, x: good ? 12 : -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.4 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.08 * i }}
            className={`flex items-start gap-3 border-t border-white/[0.06] pt-3 text-[14px] leading-relaxed ${good ? "text-white/85" : "text-white/40"}`}
          >
            <span className={`mt-2 inline-block h-1 w-3 shrink-0 ${good ? "bg-white" : "bg-white/20"}`} />
            <span>{t}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

function StepCard({ n, time, title, body }: { n: string; time: string; title: string; body: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="group relative overflow-hidden bg-[#070707] p-8"
    >
      <div className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-white/60 transition-transform duration-500 group-hover:scale-x-100" />
      <div className="flex items-baseline justify-between">
        <div
          className="text-[64px] leading-none text-white/12"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {n}
        </div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-white/30" style={{ fontFamily: "var(--font-mono)" }}>
          {time}
        </div>
      </div>
      <h3 className="mt-6 text-xl font-semibold tracking-tight text-white">{title}</h3>
      <p className="mt-3 text-[14px] leading-relaxed text-white/50">{body}</p>
    </motion.div>
  );
}

function DashboardMockup() {
  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
        </div>
        <div
          className="text-[10px] uppercase tracking-widest text-white/25"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          portion · dashboard
        </div>
        <div className="text-[10px] text-white/25" style={{ fontFamily: "var(--font-mono)" }}>
          Today
        </div>
      </div>

      <div className="grid grid-cols-12 gap-[1px]" style={{ background: "rgba(255,255,255,0.04)" }}>
        {/* Health */}
        <div className="col-span-12 bg-[#0C0C0A] p-5 sm:col-span-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-white/45">
              <Dumbbell className="h-3.5 w-3.5" /> Health
            </div>
            <div className="text-[10px] text-white/25" style={{ fontFamily: "var(--font-mono)" }}>
              Push · Day 47/120
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/30">Body weight</div>
                <div className="mt-1 text-2xl font-semibold text-white" style={{ fontFamily: "var(--font-mono)" }}>
                  71.4 kg
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-white/30">Target</div>
                <div className="mt-1 text-sm text-white/70" style={{ fontFamily: "var(--font-mono)" }}>
                  68.0 kg · Jul 4
                </div>
              </div>
            </div>

            <svg viewBox="0 0 300 60" className="mt-3 h-14 w-full">
              <defs>
                <linearGradient id="wg3" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="white" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,16 C40,22 70,14 100,26 C130,38 160,34 190,40 C220,46 250,43 300,50"
                stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" fill="none"
              />
              <path
                d="M0,16 C40,22 70,14 100,26 C130,38 160,34 190,40 C220,46 250,43 300,50 L300,60 L0,60 Z"
                fill="url(#wg3)"
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
                  <div className="text-[10px] uppercase tracking-wider text-white/30">{m.label}</div>
                  <div className="text-[10px] text-white/45" style={{ fontFamily: "var(--font-mono)" }}>
                    {m.value}/{m.target}
                  </div>
                </div>
                <div className="mt-1.5 h-1 bg-white/5">
                  <div
                    className="h-full"
                    style={{
                      width: `${(m.value / m.target) * 100}%`,
                      background: "linear-gradient(90deg, rgba(255,255,255,0.85), rgba(255,255,255,0.35))",
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
            <div className="flex items-center gap-2 text-xs text-white/45">
              <TrendingUp className="h-3.5 w-3.5" /> Money
            </div>
            <div className="text-[10px] text-white/25" style={{ fontFamily: "var(--font-mono)" }}>
              This month
            </div>
          </div>

          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-wider text-white/30">Revenue</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-2xl font-semibold text-white" style={{ fontFamily: "var(--font-mono)" }}>
                €2,140
              </div>
              <div className="text-xs text-white/35" style={{ fontFamily: "var(--font-mono)" }}>
                / €3,000
              </div>
            </div>
            <div className="mt-2 h-1 bg-white/5">
              <div
                className="h-full w-[71%]"
                style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.85), rgba(255,255,255,0.35))" }}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-[1px]" style={{ background: "rgba(255,255,255,0.05)" }}>
            {[
              { label: "Deep work", value: "18h" },
              { label: "Calls / wk", value: "9" },
              { label: "Audience", value: "8.2k" },
              { label: "Growth", value: "+11%" },
            ].map((s) => (
              <div key={s.label} className="bg-[#0C0C0A] px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-white/25">{s.label}</div>
                <div className="mt-0.5 text-sm font-medium text-white" style={{ fontFamily: "var(--font-mono)" }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="col-span-12 bg-[#0C0C0A] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-white/45">
              <Target className="h-3.5 w-3.5" /> Today
            </div>
            <div className="text-[10px] text-white/50" style={{ fontFamily: "var(--font-mono)" }}>
              3 / 5 done
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Push session · 60 min", done: true },
              { label: "Hit 180g protein", done: true },
              { label: "Deep work · 2h", done: true },
              { label: "Cold shower", done: false },
              { label: "Reply to DMs", done: false },
            ].map((t) => (
              <div
                key={t.label}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px]"
                style={{
                  border: t.done ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.07)",
                  background: t.done ? "rgba(255,255,255,0.07)" : "transparent",
                  color: t.done ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.28)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span
                  className="flex h-3 w-3 items-center justify-center"
                  style={{
                    background: t.done ? "white" : "transparent",
                    border: t.done ? "none" : "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  {t.done && <span className="text-[8px] font-bold text-[#080808]">✓</span>}
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
    "LOCK IN", "STAY HARD", "BE THE GUY", "GMI",
    "NO EXCUSES", "EVERY DAY", "BUILT DIFFERENT", "SHIP IT",
    "DO BOTH", "EARN IT",
  ];
  const loop = [...words, ...words, ...words];
  return (
    <div
      className="relative z-10 py-5"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.5)",
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
          transition={{ duration: 38, ease: "linear", repeat: Infinity }}
        >
          {loop.map((w, i) => (
            <span
              key={i}
              className="flex shrink-0 items-center gap-10"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(20px, 2.6vw, 30px)",
                letterSpacing: "0.06em",
                color: "rgba(255,255,255,0.20)",
              }}
            >
              {w}
              <span className="h-1.5 w-1.5 shrink-0 bg-white/40" />
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
      className="group relative overflow-hidden bg-[#070707] p-8 sm:p-10"
    >
      <div className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-white transition-transform duration-500 group-hover:scale-x-100" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-xs text-white/45">
          {icon}
          <span className="text-[16px] tracking-[0.08em]" style={{ fontFamily: "var(--font-display)" }}>
            {label}
          </span>
        </div>
        <div className="h-px w-8 bg-white/10" />
      </div>

      <h3 className="mt-5 text-2xl font-semibold leading-tight tracking-tight text-white">{title}</h3>
      <p className="mt-3 text-[14px] leading-relaxed text-white/50">{body}</p>

      <div className="mt-7 grid grid-cols-3 gap-4 border-t border-white/[0.06] pt-6">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.2 + i * 0.07 }}
          >
            <div className="text-[10px] uppercase tracking-widest text-white/25">{s.label}</div>
            <div className="mt-1 text-xl font-medium text-white" style={{ fontFamily: "var(--font-mono)" }}>
              {s.value}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
