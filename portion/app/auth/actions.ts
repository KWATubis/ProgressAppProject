"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type AuthResult =
  | { error: string }
  | { ok: true; needsConfirmation?: boolean };

export async function login(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function signup(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "") || null;

  // Build an absolute URL for the confirmation link to redirect back to.
  // Works in dev (localhost) and prod (Vercel) by reading the request origin.
  const h = await headers();
  const origin = h.get("origin") ?? (h.get("host") ? `https://${h.get("host")}` : "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: name ? { name } : undefined,
    },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Signup failed — no user returned." };

  // When email confirmation is enabled, signUp returns a user but NO session.
  // Don't create the profile or log them in yet — the /auth/callback route
  // does that once they click the link. Surface a "check your email" state.
  if (!data.session) {
    return { ok: true, needsConfirmation: true };
  }

  // Confirmation disabled → session is already live, proceed straight in.
  await prisma.profile.upsert({
    where: { id: data.user.id },
    update: { email, name: name ?? undefined },
    create: { id: data.user.id, email, name: name ?? undefined },
  });

  redirect("/onboarding");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
