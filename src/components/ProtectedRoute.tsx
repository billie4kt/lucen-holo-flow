import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole, AppRole } from "@/hooks/useRole";

export default function ProtectedRoute({
  children,
  role,
}: {
  children: ReactNode;
  role?: AppRole;
}) {
  const { user, loading } = useAuth();
  const { roles, loading: roleLoading, isAdmin } = useRole();
  const loc = useLocation();

  if (loading || (role && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to={`/auth?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  }
  if (role && !roles.includes(role) && !(role === "client" && isAdmin)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
