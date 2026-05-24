"use client";

import { useSyncExternalStore, type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

const subscribe = () => () => {};

// Recharts' ResponsiveContainer occasionally measures its parent at -1 on the
// first paint under React 19 + Turbopack, leaving an empty box. Gating on
// post-hydration via useSyncExternalStore lets the DOM settle so the chart
// sees real dimensions on its first render.
function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function ChartFrame({
  height,
  children,
}: {
  height: number;
  children: ReactElement;
}) {
  const mounted = useHasMounted();

  if (!mounted) {
    return <div style={{ width: "100%", height }} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      {children}
    </ResponsiveContainer>
  );
}
