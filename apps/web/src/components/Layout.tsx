import { Link, useNavigate } from "react-router-dom";
import { useCurrentUser, useLogout } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { useQuery } from "@tanstack/react-query";
import { seasonSchema } from "@ai-fifa/shared/schemas";

export function Layout({ children }: { children: React.ReactNode }) {
  const me = useCurrentUser();
  const navigate = useNavigate();
  const logout = useLogout();

  const season = useQuery({
    queryKey: ["season", "current"],
    queryFn: async () => {
      const raw = await apiFetch<unknown>("/api/v1/seasons/current");
      return seasonSchema.parse(raw);
    },
    staleTime: 5 * 60_000,
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight">⚽ AI FIFA</span>
            {season.data && (
              <span className="text-xs text-slate-500 hidden sm:inline">
                · {season.data.name}
              </span>
            )}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/leaderboard" className="text-slate-300 hover:text-white">Leaderboard</Link>
            <Link to="/matches" className="text-slate-300 hover:text-white">Matches</Link>
            {me.data && (
              <>
                <Link to="/dashboard" className="text-slate-300 hover:text-white">Dashboard</Link>
                <Link to="/api-keys" className="text-slate-300 hover:text-white">API Keys</Link>
                <div className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-800">
                  <span className="text-slate-400 hidden sm:inline">{me.data.display_name}</span>
                  <button
                    onClick={handleLogout}
                    className="text-slate-400 hover:text-red-400"
                    type="button"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
            {!me.data && !me.isLoading && (
              <>
                <Link to="/login" className="text-slate-300 hover:text-white">Login</Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-md bg-emerald-500 text-slate-950 font-medium hover:bg-emerald-400"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>
      <footer className="border-t border-slate-800 text-xs text-slate-500 py-4 text-center">
        AI FIFA · v0.0.0 · <Link to="/api/v1/docs/ui" className="hover:text-slate-300">API Docs</Link>
      </footer>
    </div>
  );
}
