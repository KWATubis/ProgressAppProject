import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  Dumbbell,
  Wallet,
  TrendingUp,
  Target,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/check-in", label: "Daily check-in", icon: CheckSquare },
  { href: "/tasks", label: "Tasks", icon: CalendarDays },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/health", label: "Health", icon: Dumbbell },
  { href: "/money", label: "Money", icon: Wallet },
  { href: "/progress", label: "Progress", icon: TrendingUp },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}
