import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LogOut, User } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, createdAt: true },
  });

  const displayName = profile?.name || profile?.email || user.email || "—";
  const memberSince = profile?.createdAt
    ? new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "long", day: "numeric" }).format(
        new Date(profile.createdAt)
      )
    : null;

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {profile?.name && (
              <p className="mt-1 text-xs text-muted-foreground">{profile.email}</p>
            )}
          </div>
        </div>
        {memberSince && (
          <p className="text-xs text-muted-foreground">Member since {memberSince}</p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Account</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Sign out on this device</p>
        </div>
        <Separator />
        <form action="/auth/logout" method="post">
          <Button type="submit" variant="destructive" className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </section>
    </div>
  );
}
