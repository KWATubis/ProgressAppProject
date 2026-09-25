import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { LandingPage } from "@/components/landing/LandingPage";

export default async function Home() {
  const user = await getAuthUser();

  if (user) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
