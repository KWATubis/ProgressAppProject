"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncLastNDays } from "@/lib/garmin/sync";

export async function syncGarminWellness(days = 7): Promise<{
  ok: boolean;
  message: string;
  results?: Array<{ date: string; ok: boolean; err?: string }>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  try {
    const results = await syncLastNDays(user.id, days);
    const okCount = results.filter((r) => r.ok).length;
    revalidatePath("/health");
    revalidatePath("/dashboard");
    return {
      ok: okCount > 0,
      message: `Synced ${okCount}/${results.length} days from Garmin.`,
      results,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed.";
    return { ok: false, message: msg };
  }
}
