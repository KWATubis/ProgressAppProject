import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  toUtcMidnight,
  formatISODate,
  parseISODate,
  getWeekDates,
  addDays,
  sameUtcDay,
} from "@/lib/utils/dates";
import { isTaskScheduledOn } from "@/lib/utils/tasks";
import { TaskCalendarView, type WeekDay } from "@/components/tasks/TaskCalendarView";
import { AddTaskDialog } from "@/components/tasks/AddTaskDialog";
import type { CalendarTask } from "@/components/tasks/TaskCard";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const today = toUtcMidnight();
  const weekRef = params.week ? parseISODate(params.week) : today;
  const week = getWeekDates(weekRef);
  const weekStart = week[0];
  const weekEnd = week[6];

  const [tasks, logs, dayOrders] = await Promise.all([
    prisma.task.findMany({
      where: { profileId: user.id, isActive: true },
      orderBy: [{ pillar: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.taskLog.findMany({
      where: {
        profileId: user.id,
        date: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.taskDayOrder.findMany({
      where: {
        profileId: user.id,
        date: { gte: weekStart, lte: weekEnd },
      },
      select: { taskId: true, date: true, sortOrder: true },
    }),
  ]);

  const logKey = (taskId: string, d: Date) => `${taskId}::${formatISODate(d)}`;
  const logIndex = new Map(logs.map((l) => [logKey(l.taskId, l.date), l.status]));
  // Per-day override of task position. Missing entries fall back to the
  // task's global sortOrder so a task that's never been reordered keeps a
  // stable spot.
  const dayOrderIndex = new Map(
    dayOrders.map((o) => [logKey(o.taskId, o.date), o.sortOrder]),
  );

  const taskSortOrder = new Map(tasks.map((t) => [t.id, t.sortOrder]));

  const days: WeekDay[] = week.map((d) => {
    const dayTasks: CalendarTask[] = tasks
      .filter((t) => isTaskScheduledOn(t, d))
      .map((t) => ({
        id: t.id,
        title: t.title,
        pillar: t.pillar,
        frequency: t.frequency,
        status: logIndex.get(logKey(t.id, d)) ?? "PENDING",
        durationMin: t.durationMin,
      }))
      // SKIPPED tasks are hidden for that specific day. The recurring task
      // itself stays untouched and shows on its other scheduled days.
      .filter((t) => t.status !== "SKIPPED")
      .sort((a, b) => {
        const ao =
          dayOrderIndex.get(logKey(a.id, d)) ?? taskSortOrder.get(a.id) ?? 0;
        const bo =
          dayOrderIndex.get(logKey(b.id, d)) ?? taskSortOrder.get(b.id) ?? 0;
        return ao - bo;
      });
    return {
      iso: formatISODate(d),
      label: DAY_LABELS[d.getUTCDay()],
      dayNum: d.getUTCDate(),
      isToday: sameUtcDay(d, today),
      dayOfWeek: d.getUTCDay(),
      tasks: dayTasks,
    };
  });

  const weekLabel = `${weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} – ${weekEnd.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  const prevWeek = formatISODate(addDays(weekStart, -7));
  const nextWeek = formatISODate(addDays(weekStart, 7));
  const currentWeek = formatISODate(getWeekDates(today)[0]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Your week at a glance. {tasks.length} active{" "}
            {tasks.length === 1 ? "task" : "tasks"}.
          </p>
        </div>
        <AddTaskDialog />
      </div>

      <TaskCalendarView
        days={days}
        weekLabel={weekLabel}
        prevWeek={prevWeek}
        nextWeek={nextWeek}
        currentWeek={currentWeek}
      />
    </div>
  );
}
