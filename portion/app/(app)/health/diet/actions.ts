"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  dietKcalTarget: z.number().int().min(1).max(10000),
  dietProteinGTarget: z.number().int().min(1).max(1000),
  dietFatGTarget: z.number().int().min(1).max(1000),
  dietCarbsGTarget: z.number().int().min(1).max(1000),
});

export type ActionResult = { ok: true } | { error: string };

export async function updateDietTargets(input: unknown): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await prisma.profile.update({
      where: { id: user.id },
      data: parsed.data,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save" };
  }

  revalidatePath("/health/diet");
  revalidatePath("/progress");
  return { ok: true };
}
