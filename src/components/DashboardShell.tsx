import { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

export default function DashboardShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  const { signOut, user } = useAuth();
  const { isAdmin } = useRole();
  const loc = useLocation();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 shrink-0 border-r bg-card/40 flex flex-col">
        <div className="px-5 py-5 border-b">
          <Link to="/" className="text-[10px] uppercase tracking-[0.35em] text-primary">Lucen</Link>
          <p className="font-display text-lg mt-1">{title}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`
              }
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t space-y-2">
          {isAdmin && !loc.pathname.startsWith("/admin") && (
            <Link to="/admin" className="text-xs text-primary block px-3">Switch to admin →</Link>
          )}
          {isAdmin && loc.pathname.startsWith("/admin") && (
            <Link to="/dashboard" className="text-xs text-primary block px-3">Switch to client view →</Link>
          )}
          <div className="px-3 text-xs text-muted-foreground truncate">{user?.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8">{children}</div>
      </main>
    </div>
  );
}
