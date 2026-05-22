import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MoneySubNav } from "@/components/money/MoneySubNav";

export default async function MoneyLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Money</h1>
        <p className="text-sm text-muted-foreground">
          Building wealth and future possibilities — income, audience, skills, and the assets that compound into it.
        </p>
        <MoneySubNav />
      </div>
      {children}
    </div>
  );
}
