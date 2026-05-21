"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems, isNavItemActive } from "./nav-items";

const listVariants = {
  open: {
    transition: { staggerChildren: 0.07, delayChildren: 0.12 },
  },
  closed: {
    transition: { staggerChildren: 0.04, staggerDirection: -1 },
  },
};

const itemVariants = {
  open: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 380, damping: 32 },
  },
  closed: {
    x: -40,
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

export function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ backgroundColor: "#000" }}
            className="fixed inset-0 z-50 flex flex-col md:hidden"
          >
            <div className="flex h-14 shrink-0 items-center justify-between px-5">
              <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <span className="h-2 w-2 rounded-full bg-foreground shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
                Portion
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <motion.nav
              variants={listVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="relative flex flex-1 flex-col justify-center gap-2 px-6"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(pathname, item.href);
                return (
                  <motion.button
                    key={item.href}
                    variants={itemVariants}
                    type="button"
                    onClick={() => go(item.href)}
                    className={cn(
                      "flex items-center gap-4 rounded-xl px-4 py-4 text-left transition-colors",
                      active
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-6 w-6 shrink-0" />
                    <span className="text-2xl font-semibold tracking-tight">
                      {item.label}
                    </span>
                  </motion.button>
                );
              })}
            </motion.nav>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
