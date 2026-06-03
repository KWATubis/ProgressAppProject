"use client";

import { Children, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Reveals its direct children in sequence on mount. Each child is wrapped in a
 * motion.div, so pass layout/spacing classes (e.g. `space-y-6`) via `className`
 * exactly as you would on a normal container. Honors reduced-motion.
 */
export function Stagger({
  children,
  className,
  step = 0.08,
  delay = 0.04,
  y = 16,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  const items = Children.toArray(children);

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <div className={className}>
      {items.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: delay + i * step }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
