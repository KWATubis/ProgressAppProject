import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatISODate } from "@/lib/utils/dates";
import { WeightProgressChart, type WeightDataPoint } from "@/components/charts/WeightProgressChart";

export default async function HealthMetricsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const metrics = await prisma.bodyMetric.findMany({
    where: { profileId: user.id },
    orderBy: { date: "desc" },
  });

  const weightData: WeightDataPoint[] = metrics
    .filter((m) => m.weightKg != null)
    .map((m) => ({ date: formatISODate(m.date), weightKg: m.weightKg! }))
    .reverse();

  const METRIC_KEYS: { key: keyof typeof metrics[0]; label: string; unit: string }[] = [
    { key: "weightKg", label: "Weight", unit: "kg" },
    { key: "bodyFatPct", label: "Body fat", unit: "%" },
    { key: "chestCm", label: "Chest", unit: "cm" },
    { key: "waistCm", label: "Waist", unit: "cm" },
    { key: "hipsCm", label: "Hips", unit: "cm" },
    { key: "armCm", label: "Arm", unit: "cm" },
    { key: "thighCm", label: "Thigh", unit: "cm" },
  ];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Weight Chart</h2>
        <div className="rounded-lg border border-white/10 bg-card p-4">
          <WeightProgressChart data={weightData} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">All Measurements</h2>
        {metrics.length === 0 ? (
          <p className="text-sm text-muted-foreground">No metrics logged yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Date
                  </th>
                  {METRIC_KEYS.map((mk) => (
                    <th
                      key={mk.key}
                      className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground"
                    >
                      {mk.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {metrics.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
                      {m.date.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    {METRIC_KEYS.map((mk) => {
                      const val = m[mk.key as keyof typeof m] as number | null;
                      return (
                        <td
                          key={mk.key}
                          className="px-4 py-2.5 text-right tabular-nums"
                        >
                          {val != null ? (
                            <>
                              {typeof val === "number" ? val.toFixed(1) : val}
                              <span className="ml-0.5 text-xs text-muted-foreground">
                                {mk.unit}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
