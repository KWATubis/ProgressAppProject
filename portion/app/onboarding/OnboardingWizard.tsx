"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  Plus,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { savePlan } from "./actions";
import { ArchetypePicker } from "./ArchetypePicker";
import type { Archetype, ArchetypeId } from "./defaults";
import type { Frequency, PillarPlan, WizardGoal, WizardHabit, WizardPlan } from "./types";

const ease = [0.16, 1, 0.3, 1] as const;

const STORAGE_KEY = "portion_onboarding_v2";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"]; // 0=Sun

export function OnboardingWizard({
  defaults,
  archetypes,
  userName,
}: {
  defaults: WizardPlan;
  archetypes: Archetype[];
  userName: string | null;
  userEmail: string;
}) {
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<WizardPlan>(defaults);
  const [archetypeId, setArchetypeId] = useState<ArchetypeId | null>(null);
  const [pending, startTransition] = useTransition();

  // Restore from localStorage (if user refreshed mid-wizard)
  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { archetypeId?: ArchetypeId | null; step?: number; plan?: WizardPlan };
      if (saved.plan) setPlan(saved.plan);
      if (saved.archetypeId) setArchetypeId(saved.archetypeId);
      if (typeof saved.step === "number") setStep(Math.min(Math.max(saved.step, 0), 3));
    } catch {
      // ignore corrupt state
    }
  }, []);

  // Mirror to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ archetypeId, step, plan }));
  }, [archetypeId, step, plan]);

  const updatePillar = (which: "health" | "money", patch: PillarPlan) => {
    setPlan((p) => ({ ...p, [which]: patch }));
  };

  function selectArchetype(id: ArchetypeId) {
    // Only reseed the plan when switching to a *different* archetype — clicking
    // the already-selected one (e.g. after navigating Back) preserves edits.
    if (id !== archetypeId) {
      const chosen = archetypes.find((a) => a.id === id);
      if (chosen) setPlan(chosen.plan);
      setArchetypeId(id);
    }
    setStep(1);
  }

  function next() {
    setStep((s) => Math.min(s + 1, 3));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit() {
    startTransition(async () => {
      const result = await savePlan(JSON.stringify(plan));
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      // Clear localStorage on success
      if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    });
  }

  const steps = [
    { label: "You", icon: <Sparkles className="h-4 w-4" /> },
    { label: "Health", icon: <Dumbbell className="h-4 w-4" /> },
    { label: "Money", icon: <TrendingUp className="h-4 w-4" /> },
    { label: "Confirm", icon: <Check className="h-4 w-4" /> },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.06),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.04),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.8)]" />
          <span className="text-lg font-semibold tracking-tight">Portion</span>
        </Link>
        <div className="text-xs text-white/40">
          {userName ? `${userName} · ` : ""}step {step + 1} of 4
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-6 sm:px-10">
        {/* Step indicator */}
        <div className="mb-10 flex items-center gap-2">
          {steps.map((s, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <div key={s.label} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs transition ${
                    active
                      ? "border-white bg-white text-black"
                      : done
                      ? "border-white/40 bg-white/10 text-white"
                      : "border-white/10 text-white/40"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : s.icon}
                </div>
                <div
                  className={`hidden text-xs font-medium uppercase tracking-wider sm:block ${
                    active ? "text-white" : "text-white/40"
                  }`}
                >
                  {s.label}
                </div>
                {i < steps.length - 1 && (
                  <div className="ml-2 h-px flex-1 bg-white/10">
                    <motion.div
                      className="h-full bg-white"
                      initial={false}
                      animate={{ width: done ? "100%" : "0%" }}
                      transition={{ duration: 0.5, ease }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepWrapper key="archetype">
              <ArchetypePicker
                archetypes={archetypes}
                selectedId={archetypeId}
                onSelect={selectArchetype}
                userName={userName}
              />
            </StepWrapper>
          )}
          {step === 1 && (
            <StepWrapper key="health">
              <PillarStep
                pillar="health"
                title="Your body."
                subtitle="What are you training toward, and what habits get you there?"
                plan={plan.health}
                onChange={(p) => updatePillar("health", p)}
                addGoalLabel="Add a health goal"
                addHabitLabel="Add a health habit"
              />
            </StepWrapper>
          )}
          {step === 2 && (
            <StepWrapper key="money">
              <PillarStep
                pillar="money"
                title="Your bag."
                subtitle="What income, brand, or skill are you building — and what do you do every week?"
                plan={plan.money}
                onChange={(p) => updatePillar("money", p)}
                addGoalLabel="Add a money goal"
                addHabitLabel="Add a money habit"
              />
            </StepWrapper>
          )}
          {step === 3 && (
            <StepWrapper key="confirm">
              <ConfirmStep plan={plan} />
            </StepWrapper>
          )}
        </AnimatePresence>

        <div className="mt-10 flex items-center justify-between border-t border-white/5 pt-6">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              disabled={step === 0 && !archetypeId}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:hover:scale-100"
            >
              Continue
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            >
              {pending ? "Building your plan…" : "Build my plan"}
              {!pending && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function StepWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, ease }}
    >
      {children}
    </motion.div>
  );
}

function PillarStep({
  pillar,
  title,
  subtitle,
  plan,
  onChange,
  addGoalLabel,
  addHabitLabel,
}: {
  pillar: "health" | "money";
  title: string;
  subtitle: string;
  plan: PillarPlan;
  onChange: (p: PillarPlan) => void;
  addGoalLabel: string;
  addHabitLabel: string;
}) {
  function updateGoal(i: number, patch: Partial<WizardGoal>) {
    const goals = plan.goals.map((g, idx) => (idx === i ? { ...g, ...patch } : g));
    onChange({ ...plan, goals });
  }
  function addGoal() {
    onChange({
      ...plan,
      goals: [
        ...plan.goals,
        { title: "", currentValue: null, targetValue: null, unit: "", targetDate: null },
      ],
    });
  }
  function removeGoal(i: number) {
    onChange({ ...plan, goals: plan.goals.filter((_, idx) => idx !== i) });
  }

  function updateHabit(i: number, patch: Partial<WizardHabit>) {
    const habits = plan.habits.map((h, idx) => (idx === i ? { ...h, ...patch } : h));
    onChange({ ...plan, habits });
  }
  function addHabit() {
    onChange({
      ...plan,
      habits: [
        ...plan.habits,
        { title: "", frequency: "DAILY", dayOfWeek: [], checked: true },
      ],
    });
  }
  function removeHabit(i: number) {
    onChange({ ...plan, habits: plan.habits.filter((_, idx) => idx !== i) });
  }

  const accentLabel = pillar === "health" ? "HEALTH" : "MONEY";

  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-widest text-white/40">
        {accentLabel}
      </div>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-xl text-base text-white/60">{subtitle}</p>

      <section className="mt-10">
        <SectionHeader title="Goals" hint="What do you want to hit, in numbers?" />
        <div className="mt-4 space-y-3">
          {plan.goals.map((g, i) => (
            <GoalCard
              key={i}
              goal={g}
              onChange={(patch) => updateGoal(i, patch)}
              onRemove={() => removeGoal(i)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addGoal}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-dashed border-white/15 px-4 py-2 text-sm text-white/60 transition hover:border-white/30 hover:text-white"
        >
          <Plus className="h-4 w-4" />
          {addGoalLabel}
        </button>
      </section>

      <section className="mt-12">
        <SectionHeader
          title="Habits"
          hint="The recurring work that gets you there. Uncheck what doesn't apply."
        />
        <div className="mt-4 space-y-2">
          {plan.habits.map((h, i) => (
            <HabitRow
              key={i}
              habit={h}
              onChange={(patch) => updateHabit(i, patch)}
              onRemove={() => removeHabit(i)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addHabit}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-dashed border-white/15 px-4 py-2 text-sm text-white/60 transition hover:border-white/30 hover:text-white"
        >
          <Plus className="h-4 w-4" />
          {addHabitLabel}
        </button>
      </section>
    </div>
  );
}

function SectionHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-xs text-white/40">{hint}</p>
    </div>
  );
}

function GoalCard({
  goal,
  onChange,
  onRemove,
}: {
  goal: WizardGoal;
  onChange: (patch: Partial<WizardGoal>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group relative rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/20">
      <div className="grid grid-cols-12 gap-3">
        <input
          value={goal.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Goal — e.g. Bodybuilding contest weight"
          className="col-span-12 bg-transparent text-sm font-medium text-white placeholder:text-white/30 focus:outline-none"
        />
        <NumberField
          label="From"
          value={goal.currentValue}
          onChange={(v) => onChange({ currentValue: v })}
        />
        <NumberField
          label="To"
          value={goal.targetValue}
          onChange={(v) => onChange({ targetValue: v })}
        />
        <TextField
          label="Unit"
          value={goal.unit}
          onChange={(v) => onChange({ unit: v })}
          placeholder="kg, followers, PLN/mo"
        />
        <DateField
          label="Deadline"
          value={goal.targetDate}
          onChange={(v) => onChange({ targetDate: v })}
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-3 top-3 text-white/30 opacity-0 transition group-hover:opacity-100 hover:text-white"
        aria-label="Remove goal"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="col-span-6 sm:col-span-3">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : Number(v));
        }}
        className="mt-1 w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="col-span-6 sm:col-span-3">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
      />
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <label className="col-span-12 sm:col-span-3">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="mt-1 w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none [color-scheme:dark]"
      />
    </label>
  );
}

function HabitRow({
  habit,
  onChange,
  onRemove,
}: {
  habit: WizardHabit;
  onChange: (patch: Partial<WizardHabit>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border border-white/10 p-3 transition ${
        habit.checked ? "bg-white/[0.03]" : "bg-transparent opacity-60 hover:opacity-100"
      }`}
    >
      <button
        type="button"
        onClick={() => onChange({ checked: !habit.checked })}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
          habit.checked ? "border-white bg-white" : "border-white/30 hover:border-white/60"
        }`}
        aria-label="Toggle habit"
      >
        {habit.checked && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
      </button>

      <input
        value={habit.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Habit"
        className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
      />

      <FrequencyPills
        value={habit.frequency}
        onChange={(f) => onChange({ frequency: f, dayOfWeek: f === "WEEKLY" ? habit.dayOfWeek : [] })}
      />

      {habit.frequency === "WEEKLY" && (
        <DaySelector
          days={habit.dayOfWeek}
          onChange={(days) => onChange({ dayOfWeek: days })}
        />
      )}

      <button
        type="button"
        onClick={onRemove}
        className="text-white/30 opacity-0 transition group-hover:opacity-100 hover:text-white"
        aria-label="Remove habit"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function FrequencyPills({
  value,
  onChange,
}: {
  value: Frequency;
  onChange: (f: Frequency) => void;
}) {
  const options: { label: string; value: Frequency }[] = [
    { label: "Daily", value: "DAILY" },
    { label: "Weekly", value: "WEEKLY" },
    { label: "Once", value: "ONE_TIME" },
  ];
  return (
    <div className="hidden gap-1 rounded-full border border-white/10 bg-black/30 p-0.5 sm:flex">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
            value === o.value ? "bg-white text-black" : "text-white/60 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DaySelector({
  days,
  onChange,
}: {
  days: number[];
  onChange: (d: number[]) => void;
}) {
  function toggle(i: number) {
    const next = days.includes(i) ? days.filter((d) => d !== i) : [...days, i].sort((a, b) => a - b);
    onChange(next);
  }
  return (
    <div className="hidden gap-0.5 sm:flex">
      {DAYS.map((d, i) => {
        const active = days.includes(i);
        return (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            className={`h-6 w-6 rounded text-[10px] font-semibold transition ${
              active ? "bg-white text-black" : "bg-white/5 text-white/40 hover:bg-white/10"
            }`}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

function ConfirmStep({ plan }: { plan: WizardPlan }) {
  const healthHabits = plan.health.habits.filter((h) => h.checked).length;
  const moneyHabits = plan.money.habits.filter((h) => h.checked).length;
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-widest text-white/40">
        Confirm
      </div>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Your plan.</h1>
      <p className="mt-3 max-w-xl text-base text-white/60">
        This is what you&apos;re committing to. You can change it any time from the dashboard.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <PillarSummary
          icon={<Dumbbell className="h-4 w-4" />}
          label="Health"
          goals={plan.health.goals}
          habitCount={healthHabits}
        />
        <PillarSummary
          icon={<TrendingUp className="h-4 w-4" />}
          label="Money"
          goals={plan.money.goals}
          habitCount={moneyHabits}
        />
      </div>
    </div>
  );
}

function PillarSummary({
  icon,
  label,
  goals,
  habitCount,
}: {
  icon: React.ReactNode;
  label: string;
  goals: WizardGoal[];
  habitCount: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/60">
        {icon}
        {label}
      </div>
      <div className="mt-4 space-y-3">
        {goals
          .filter((g) => g.title.trim())
          .map((g, i) => (
            <div key={i} className="border-l border-white/10 pl-3">
              <div className="text-sm font-semibold">{g.title}</div>
              <div className="mt-1 text-xs text-white/50">
                {g.currentValue !== null && g.targetValue !== null
                  ? `${g.currentValue} → ${g.targetValue} ${g.unit}`
                  : g.targetValue !== null
                  ? `Target: ${g.targetValue} ${g.unit}`
                  : ""}
                {g.targetDate ? ` · by ${g.targetDate}` : ""}
              </div>
            </div>
          ))}
        {goals.filter((g) => g.title.trim()).length === 0 && (
          <div className="text-sm text-white/40">No goals — add some on the previous step.</div>
        )}
      </div>
      <div className="mt-5 border-t border-white/5 pt-4 text-xs text-white/50">
        {habitCount} {habitCount === 1 ? "habit" : "habits"} active
      </div>
    </div>
  );
}
