import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatISODate } from "@/lib/utils/dates";
import { IncomeChart, type IncomeMonth } from "@/components/charts/IncomeChart";
import { IncomeForm } from "@/components/money/IncomeForm";
import { IncomeList, type IncomeRow } from "@/components/money/IncomeList";

export default async function MoneyIncomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [goals, entries] = await Promise.all([
    prisma.goal.findMany({
      where: { profileId: user.id, pillar: "MONEY", isActive: true },
    }),
    prisma.incomeEntry.findMany({
      where: { profileId: user.id },
      orderBy: { date: "desc" },
    }),
  ]);

  const incomeGoal = goals.find(
    (g) => (g.unit ?? "").toLowerCase().includes("pln") || (g.unit ?? "").toLowerCase().includes("month"),
  );

  const byMonth = new Map<string, number>();
  for (const e of entries) {
    const key = `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + e.amountPln);
  }
  const monthData: IncomeMonth[] = Array.from(byMonth.entries())
    .map(([month, amountPln]) => ({ month, amountPln }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const rows: IncomeRow[] = entries.map((e) => ({
    id: e.id,
    date: formatISODate(e.date),
    source: e.source,
    amountPln: e.amountPln,
    description: e.description,
  }));

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Log Income</h2>
        <div className="rounded-lg border border-white/10 bg-card p-4">
          <IncomeForm />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Monthly Income</h2>
        <div className="rounded-lg border border-white/10 bg-card p-4">
          <IncomeChart data={monthData} target={incomeGoal?.targetValue ?? null} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">All Entries</h2>
        <IncomeList entries={rows} />
      </section>
    </div>
  );
}
