import { LayoutDashboard, Inbox, Activity, FolderOpen, Users, Building2 } from "lucide-react";
import DashboardShell, { NavItem } from "@/components/DashboardShell";
import { ReactNode } from "react";

const nav: NavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/submissions", label: "Submissions", icon: Inbox },
  { to: "/admin/telemetry", label: "Telemetry", icon: Activity },
  { to: "/admin/content", label: "Content & Media", icon: FolderOpen },
  { to: "/admin/users", label: "Users & Roles", icon: Users },
  { to: "/admin/orgs", label: "Organizations", icon: Building2 },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <DashboardShell title="Admin console" nav={nav}>{children}</DashboardShell>;
}
