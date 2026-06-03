"use client";

import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";

/**
 * Standard page header — Anton display title + muted description, with an
 * optional right-aligned action slot. Reveals on mount. Use on every in-app
 * route so the product reads as one designed surface.
 */
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Reveal className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-3xl uppercase leading-none tracking-wide">{title}</h1>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Reveal>
  );
}
