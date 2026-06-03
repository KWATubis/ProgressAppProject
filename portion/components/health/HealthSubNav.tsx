"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CreateActivityDialog } from "./CreateActivityDialog";

type ActivityType = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  kind: "STRENGTH" | "CARDIO" | "SPORT";
};

const STATIC_LINKS_BEFORE = [{ href: "/health", label: "Overview", exact: true }];
const STATIC_LINKS_AFTER = [
  { href: "/health/diet", label: "Diet", exact: false },
  { href: "/health/metrics", label: "Metrics", exact: false },
];

function Tab({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "text-accent-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId="health-subnav"
          className="absolute inset-0 rounded-md bg-accent"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <span className="relative inline-flex items-center gap-1.5">{children}</span>
    </Link>
  );
}

export function HealthSubNav({ activityTypes }: { activityTypes: ActivityType[] }) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <nav className="mt-3 flex flex-wrap items-center gap-1">
      {STATIC_LINKS_BEFORE.map(({ href, label, exact }) => (
        <Tab key={href} href={href} active={isActive(href, exact)}>
          {label}
        </Tab>
      ))}

      {activityTypes.map((a) => {
        const href = `/health/activity/${a.slug}`;
        return (
          <Tab key={a.id} href={href} active={pathname.startsWith(href)}>
            {a.color && (
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: a.color }}
                aria-hidden
              />
            )}
            {a.icon ? `${a.icon} ${a.name}` : a.name}
          </Tab>
        );
      })}

      <CreateActivityDialog pillar="HEALTH" />

      {STATIC_LINKS_AFTER.map(({ href, label, exact }) => (
        <Tab key={href} href={href} active={isActive(href, exact)}>
          {label}
        </Tab>
      ))}
    </nav>
  );
}
