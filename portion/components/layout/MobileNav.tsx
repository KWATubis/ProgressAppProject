"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems, isNavItemActive } from "./nav-items";

const N = navItems.length;
const STEP = 360 / N; // seamless cylinder: N items * STEP = 360°
const RADIUS = 150; // px — how far items sit from the wheel axis
const SENSITIVITY = 0.55; // degrees of spin per px dragged

function normalize(angle: number): number {
  // map any angle to (-180, 180]
  let a = angle % 360;
  if (a > 180) a -= 360;
  if (a <= -180) a += 360;
  return a;
}

export function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);

  const startY = useRef(0);
  const startRotation = useRef(0);
  const moved = useRef(false);

  // When opening, center the wheel on the item for the current route.
  function openMenu() {
    const activeIndex = Math.max(
      0,
      navItems.findIndex((item) => isNavItemActive(pathname, item.href)),
    );
    setRotation(-activeIndex * STEP);
    setOpen(true);
  }

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

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    moved.current = false;
    startY.current = e.clientY;
    startRotation.current = rotation;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const dy = e.clientY - startY.current;
    if (Math.abs(dy) > 6) moved.current = true;
    // Drag down → wheel spins so lower items rise into view.
    setRotation(startRotation.current + dy * SENSITIVITY);
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    // Snap to the nearest item.
    setRotation((r) => Math.round(r / STEP) * STEP);
  }

  function go(href: string) {
    if (moved.current) return; // it was a spin, not a tap
    setOpen(false);
    router.push(href);
  }

  const selectedIndex = ((Math.round(-rotation / STEP) % N) + N) % N;

  return (
    <>
      <button
        type="button"
        onClick={openMenu}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
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

          <div
            className="relative flex-1 touch-none select-none overflow-hidden"
            style={{ perspective: "700px" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* center selection guides */}
            <div className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-7 border-t border-border/60" />
            <div className="pointer-events-none absolute inset-x-6 top-1/2 translate-y-7 border-t border-border/60" />

            <div
              className="absolute inset-x-0 top-1/2 h-0"
              style={{
                transformStyle: "preserve-3d",
                transform: `rotateX(${rotation}deg)`,
                transition: dragging ? "none" : "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              {navItems.map((item, i) => {
                const Icon = item.icon;
                const angle = normalize(rotation + i * STEP);
                const facing = Math.cos((angle * Math.PI) / 180); // 1 at front, <0 on back
                const isCenter = i === selectedIndex;
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => go(item.href)}
                    className="absolute inset-x-0 top-1/2 -mt-7 flex h-14 items-center justify-center gap-3"
                    style={{
                      transformOrigin: "center center",
                      transform: `rotateX(${i * STEP}deg) translateZ(${RADIUS}px)`,
                      backfaceVisibility: "hidden",
                      opacity: facing > 0.05 ? facing : 0,
                      pointerEvents: facing > 0.6 ? "auto" : "none",
                    }}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-colors",
                        isCenter ? "text-foreground" : "text-muted-foreground",
                      )}
                    />
                    <span
                      className={cn(
                        "text-2xl font-semibold tracking-tight transition-colors",
                        isCenter ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="shrink-0 pb-8 text-center text-xs text-muted-foreground">
            Swipe to spin · tap to open
          </p>
        </div>
      )}
    </>
  );
}
