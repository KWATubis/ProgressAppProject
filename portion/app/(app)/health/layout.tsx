import { HealthSubNav } from "@/components/health/HealthSubNav";

export default function HealthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Health</h1>
        <p className="text-sm text-muted-foreground">Training, nutrition, and body metrics.</p>
        <HealthSubNav />
      </div>
      {children}
    </div>
  );
}
