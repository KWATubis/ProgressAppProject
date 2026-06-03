"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { navItems, isNavItemActive } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
      <div className="flex h-14 items-center border-b border-sidebar-border px-6">
        <Link href="/dashboard" className="group flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-foreground shadow-[0_0_12px_rgba(255,255,255,0.6)] transition-transform duration-300 group-hover:scale-125" />
          <span className="font-display text-xl uppercase tracking-wide">Portion</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-md bg-accent"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Icon className="relative h-4 w-4" />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
