import { prisma } from "@/lib/prisma";
import { toUtcMidnight } from "@/lib/utils/dates";
import { isTaskScheduledOn } from "@/lib/utils/tasks";

/**
 * When the user logs a session or income tied to an `activityTypeId`,
 * automatically mark today's matching scheduled task(s) as COMPLETE.
 *
 * Silent no-op when no matching task exists — logging stands on its own
 * even if the user hasn't set up tasks for the activity yet.
 */
export async function autoTickActivityTask(args: {
  profileId: string;
  activityTypeId: string;
  date: Date;
}): Promise<{ tickedCount: number }> {
  const date = toUtcMidnight(args.date);

  const candidates = await prisma.task.findMany({
    where: {
      profileId: args.profileId,
      activityTypeId: args.activityTypeId,
      isActive: true,
    },
    select: { id: true, frequency: true, dayOfWeek: true, scheduledAt: true, isActive: true },
  });

  const matching = candidates.filter((t) => isTaskScheduledOn(t, date));
  if (matching.length === 0) return { tickedCount: 0 };

  await prisma.$transaction(
    matching.map((t) =>
      prisma.taskLog.upsert({
        where: { taskId_date: { taskId: t.id, date } },
        create: { profileId: args.profileId, taskId: t.id, date, status: "COMPLETE" },
        update: { status: "COMPLETE" },
      }),
    ),
  );

  return { tickedCount: matching.length };
}
