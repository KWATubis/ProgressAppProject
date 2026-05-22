"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/money", label: "Overview", exact: true },
  { href: "/money/content", label: "Content", exact: false },
  { href: "/money/income", label: "Income", exact: false },
];

export function MoneySubNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-3 flex flex-wrap items-center gap-1">
      {LINKS.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
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
