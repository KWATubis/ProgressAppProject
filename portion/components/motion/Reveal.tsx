"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Fade + lift a block in on mount. Honors reduced-motion (renders static). */
export function Reveal({
  children,
  delay = 0,
  y = 14,
  duration = 0.5,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
