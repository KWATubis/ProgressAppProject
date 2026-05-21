"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CreateActivityDialog } from "./CreateActivityDialog";

type ActivityType = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  kind: "STRENGTH" | "CARDIO" | "SPORT";
};

const STATIC_LINKS_BEFORE = [{ href: "/health", label: "Overview", exact: true }];
const STATIC_LINKS_AFTER = [
  { href: "/health/diet", label: "Diet", exact: false },
  { href: "/health/metrics", label: "Metrics", exact: false },
];

export function HealthSubNav({ activityTypes }: { activityTypes: ActivityType[] }) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  const linkClass = (active: boolean) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      active
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    );

  return (
    <nav className="mt-3 flex flex-wrap items-center gap-1">
      {STATIC_LINKS_BEFORE.map(({ href, label, exact }) => (
        <Link key={href} href={href} className={linkClass(isActive(href, exact))}>
          {label}
        </Link>
      ))}

      {activityTypes.map((a) => {
        const href = `/health/activity/${a.slug}`;
        return (
          <Link key={a.id} href={href} className={linkClass(pathname.startsWith(href))}>
            {a.icon ? `${a.icon} ${a.name}` : a.name}
          </Link>
        );
      })}

      <CreateActivityDialog />

      {STATIC_LINKS_AFTER.map(({ href, label, exact }) => (
        <Link key={href} href={href} className={linkClass(isActive(href, exact))}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
