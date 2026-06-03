"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Cross-fades route content on navigation. Opacity-only by design: a lingering
 * `transform` would create a containing block and break `position: fixed`
 * overlays (e.g. the /health holo-body takeover). `initial={false}` lets each
 * page own its own intro (Stagger/Reveal) on first paint.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  // Key on the top-level segment so sub-tab navigation (e.g. /health → /health/diet)
  // keeps the section layout mounted — its sub-nav indicator can slide, and only
  // major section changes cross-fade.
  const segment = "/" + (pathname.split("/")[1] ?? "");

  if (reduce) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={segment}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
