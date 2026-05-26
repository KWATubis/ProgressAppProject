"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function MoneySubNav({ activityTypes }: { activityTypes: ActivityType[] }) {
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
        const href = `/money/activity/${a.slug}`;
        return (
          <Link key={a.id} href={href} className={cn(linkClass(pathname.startsWith(href)), "inline-flex items-center gap-1.5")}>
            {a.color && (
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: a.color }}
                aria-hidden
              />
            )}
            {a.icon ? `${a.icon} ${a.name}` : a.name}
          </Link>
        );
      })}

      <CreateActivityDialog pillar="MONEY" />
    </nav>
  );
}
