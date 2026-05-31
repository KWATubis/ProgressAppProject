import Link from "next/link";
import { Settings } from "lucide-react";
import { MobileNav } from "@/components/layout/MobileNav";

type TopBarProps = {
  email?: string | null;
  name?: string | null;
};

export function TopBar({ email, name }: TopBarProps) {
  const displayName = name || email || "";

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <MobileNav />
        <span className="text-sm font-semibold text-foreground">Portion</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        {displayName && (
          <span className="hidden text-sm text-muted-foreground sm:inline">{displayName}</span>
        )}
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
