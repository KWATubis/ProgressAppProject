import type { Task } from "@prisma/client";
import { sameUtcDay } from "./dates";

/**
 * Decide whether `task` is scheduled to appear on the given `date`
 * (a UTC-midnight Date).
 */
export function isTaskScheduledOn(task: Pick<Task, "frequency" | "dayOfWeek" | "scheduledAt" | "isActive">, date: Date): boolean {
  if (!task.isActive) return false;
  switch (task.frequency) {
    case "DAILY":
      return true;
    case "WEEKLY":
      return task.dayOfWeek.includes(date.getUTCDay());
    case "ONE_TIME":
      return task.scheduledAt ? sameUtcDay(task.scheduledAt, date) : false;
    default:
      return false;
  }
}
