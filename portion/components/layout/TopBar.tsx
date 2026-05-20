import { Button } from "@/components/ui/button";

type TopBarProps = {
  email?: string | null;
  name?: string | null;
};

export function TopBar({ email, name }: TopBarProps) {
  const displayName = name || email || "";

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-sm sm:px-6">
      <div className="text-sm text-muted-foreground md:hidden font-semibold text-foreground">
        Portion
      </div>
      <div className="ml-auto flex items-center gap-4">
        {displayName && (
          <span className="hidden text-sm text-muted-foreground sm:inline">{displayName}</span>
        )}
        <form action="/auth/logout" method="post">
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
