"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/health", label: "Overview" },
  { href: "/health/workout", label: "Workouts" },
  { href: "/health/diet", label: "Diet" },
  { href: "/health/metrics", label: "Metrics" },
];

export function HealthSubNav() {
  const pathname = usePathname();
  return (
    <nav className="mt-3 flex flex-wrap gap-1">
      {LINKS.map(({ href, label }) => {
        const active =
          href === "/health" ? pathname === "/health" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
