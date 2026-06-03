"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CreateActivityDialog } from "@/components/health/CreateActivityDialog";

type ActivityType = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  kind: "SOCIAL" | "SIDE_INCOME" | "MAIN_INCOME" | "BUSINESS";
};

const STATIC_LINKS_BEFORE = [{ href: "/money", label: "Overview", exact: true }];

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
          layoutId="money-subnav"
          className="absolute inset-0 rounded-md bg-accent"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <span className="relative inline-flex items-center gap-1.5">{children}</span>
    </Link>
  );
}

export function MoneySubNav({ activityTypes }: { activityTypes: ActivityType[] }) {
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
        const href = `/money/activity/${a.slug}`;
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

      <CreateActivityDialog pillar="MONEY" />
    </nav>
  );
}
