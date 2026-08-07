import {
  BarChart3,
  Bug,
  FileText,
  Globe,
  LayoutDashboard,
  Settings2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  /** Badge key resolved against live counts at render time. */
  badge?: "openIssues";
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Portfolio health at a glance",
  },
  {
    href: "/websites",
    label: "Websites",
    icon: Globe,
    description: "Every site you monitor",
  },
  {
    href: "/audits",
    label: "Audits",
    icon: BarChart3,
    description: "Full audit history",
  },
  {
    href: "/issues",
    label: "Issues",
    icon: Bug,
    description: "Findings and remediation",
    badge: "openIssues",
  },
  {
    href: "/reports",
    label: "Reports",
    icon: FileText,
    description: "Client-ready summaries",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings2,
    description: "Profile and preferences",
  },
];

/** Longest-prefix match so `/websites/[id]` still highlights "Websites". */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function titleForPath(pathname: string): string {
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isActivePath(pathname, item.href));
  return match?.label ?? "PerformanceHub";
}
