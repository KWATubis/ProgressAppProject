import { prisma } from "@/lib/prisma";
import { toUtcMidnight, formatISODate } from "@/lib/utils/dates";
import { isTaskScheduledOn } from "@/lib/utils/tasks";

export type BrokenStreak = {
  task: { id: string; title: string };
  streak: number;
  yesterdayISO: string;
};

export async function detectBrokenStreaks(profileId: string): Promise<BrokenStreak[]> {
  const now = new Date();
  const todayUTC = toUtcMidnight(now);
  const yesterdayUTC = new Date(todayUTC.getTime() - 86_400_000);

  // Only offer recovery within 36 hours of the missed day
  const cutoff = new Date(yesterdayUTC.getTime() + 36 * 3_600_000);
  if (now > cutoff) return [];

  const windowStart = new Date(yesterdayUTC.getTime() - 60 * 86_400_000);

  const tasks = await prisma.task.findMany({
    where: { profileId, isActive: true, frequency: { in: ["DAILY", "WEEKLY"] } },
    select: {
      id: true,
      title: true,
      frequency: true,
      dayOfWeek: true,
      scheduledAt: true,
      isActive: true,
      taskLogs: {
        where: { date: { gte: windowStart, lte: yesterdayUTC }, status: "COMPLETE" },
        select: { date: true },
      },
    },
  });

  const broken: BrokenStreak[] = [];

  for (const task of tasks) {
    if (!isTaskScheduledOn(task, yesterdayUTC)) continue;

    const logTimes = new Set(task.taskLogs.map((l) => l.date.getTime()));
    if (logTimes.has(yesterdayUTC.getTime())) continue; // already logged

    // Walk backwards to compute consecutive completed scheduled days
    let streak = 0;
    let check = new Date(yesterdayUTC.getTime() - 86_400_000);
    while (check >= windowStart) {
      if (!isTaskScheduledOn(task, check)) {
        check = new Date(check.getTime() - 86_400_000);
        continue;
      }
      if (!logTimes.has(check.getTime())) break;
      streak++;
      check = new Date(check.getTime() - 86_400_000);
    }

    if (streak >= 2) {
      broken.push({ task: { id: task.id, title: task.title }, streak, yesterdayISO: formatISODate(yesterdayUTC) });
    }
  }

  return broken.sort((a, b) => b.streak - a.streak).slice(0, 3);
}
