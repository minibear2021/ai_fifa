import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useCurrentUser } from "../lib/auth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const me = useCurrentUser();
  const location = useLocation();
  if (me.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }
  if (me.data === null) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}
