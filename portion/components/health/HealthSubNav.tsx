"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CreateFolderDialog } from "./CreateFolderDialog";

type Folder = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

const STATIC_LINKS = [
  { href: "/health", label: "Overview" },
  { href: "/health/workout", label: "Workouts" },
  { href: "/health/diet", label: "Diet" },
  { href: "/health/metrics", label: "Metrics" },
];

export function HealthSubNav({ folders }: { folders: Folder[] }) {
  const pathname = usePathname();

  const allLinks = [
    ...STATIC_LINKS,
    ...folders.map((f) => ({
      href: `/health/folder/${f.slug}`,
      label: f.icon ? `${f.icon} ${f.name}` : f.name,
    })),
  ];

  return (
    <nav className="mt-3 flex flex-wrap items-center gap-1">
      {allLinks.map(({ href, label }) => {
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
      <CreateFolderDialog />
    </nav>
  );
}
