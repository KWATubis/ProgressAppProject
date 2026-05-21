"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TodayTaskList, type TodayTask } from "@/components/dashboard/TodayTaskList";
import { WorkoutLogForm } from "./WorkoutLogForm";
import { DietLogForm, type Meal } from "./DietLogForm";
import { BodyMetricForm, type MetricValues } from "./BodyMetricForm";

export function DailyCheckInPage({
  dateISO,
  tasks,
  meals,
  metric,
}: {
  dateISO: string;
  tasks: TodayTask[];
  meals: Meal[];
  metric: MetricValues;
}) {
  return (
    <Tabs defaultValue="tasks" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
        <TabsTrigger value="workout">Workout</TabsTrigger>
        <TabsTrigger value="diet">Diet</TabsTrigger>
        <TabsTrigger value="metrics">Metrics</TabsTrigger>
      </TabsList>

      <TabsContent value="tasks" className="mt-4">
        <TodayTaskList initial={tasks} dateISO={dateISO} />
      </TabsContent>

      <TabsContent value="workout" className="mt-4">
        <WorkoutLogForm dateISO={dateISO} />
      </TabsContent>

      <TabsContent value="diet" className="mt-4">
        <DietLogForm dateISO={dateISO} initialMeals={meals} />
      </TabsContent>

      <TabsContent value="metrics" className="mt-4">
        <BodyMetricForm dateISO={dateISO} initial={metric} />
      </TabsContent>
    </Tabs>
  );
}
