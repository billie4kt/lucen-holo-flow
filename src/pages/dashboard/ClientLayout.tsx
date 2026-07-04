import { LayoutDashboard, Briefcase, BarChart3, MessageSquare, Settings } from "lucide-react";
import DashboardShell, { NavItem } from "@/components/DashboardShell";
import { ReactNode } from "react";

const nav: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/engagements", label: "Engagements", icon: Briefcase },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function ClientLayout({ children }: { children: ReactNode }) {
  return <DashboardShell title="Client workspace" nav={nav}>{children}</DashboardShell>;
}
