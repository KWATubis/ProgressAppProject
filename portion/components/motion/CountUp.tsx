"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/**
 * Counts a number up from 0 → value when it scrolls into view (once).
 * SSR-safe (renders 0 until mounted, so no hydration mismatch) and
 * reduced-motion-safe (shows the final value immediately, never animates).
 */
export function CountUp({
  value,
  duration = 1.1,
  decimals = 0,
  className,
  format,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  const shown = reduce ? value : display;
  const render = format ?? ((n: number) => n.toFixed(decimals));

  return (
    <span ref={ref} className={className}>
      {render(shown)}
    </span>
  );
}
