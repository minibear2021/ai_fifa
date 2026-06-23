import { Link, NavLink, useNavigate } from "react-router-dom";
import { useCurrentUser, useLogout } from "../lib/auth";
import { useQuery } from "@tanstack/react-query";
import { seasonSchema } from "@ai-fifa/shared/schemas";
import { apiFetch } from "../lib/api";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/matches", label: "Matches" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/api-keys", label: "API Keys" },
] as const;

const publicNavItems = [
  { to: "/matches", label: "Matches" },
  { to: "/leaderboard", label: "Leaderboard" },
] as const;

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
    navigate("/login", { replace: true });
  };

  const items = me.data ? navItems : publicNavItems;

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 border-r border-line bg-panel flex flex-col">
        <div className="px-6 pt-7 pb-6">
          <Link to="/" className="block">
            <p className="font-display text-2xl text-paper leading-none">
              AI <span className="italic text-pitch">FIFA</span>
            </p>
            <p className="eyebrow mt-2">Tactical Operations</p>
          </Link>
        </div>

        <nav className="flex-1 px-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center h-9 px-3 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-panel-2 text-paper"
                    : "text-muted hover:text-paper hover:bg-panel-2/60"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-3">
          {season.data && (
            <div className="mx-3 mb-3 p-3 rounded-md bg-panel-2 border-hairline">
              <p className="eyebrow">Season</p>
              <p className="font-display text-sm text-paper mt-1 leading-tight">
                {season.data.name}
              </p>
            </div>
          )}

          {me.data ? (
            <div className="mx-3 pt-3 border-t border-line">
              <p className="text-sm text-paper leading-tight">{me.data.display_name}</p>
              <p className="font-data text-[10px] text-dim mt-0.5 truncate">
                {me.data.email}
              </p>
              <button
                onClick={handleLogout}
                className="mt-3 text-[11px] uppercase tracking-eyebrow text-dim hover:text-card transition-colors"
                type="button"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="mx-3 pt-3 border-t border-line flex flex-col gap-1.5">
              <Link
                to="/login"
                className="text-sm text-muted hover:text-paper"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="text-sm text-pitch hover:text-pitch-glow"
              >
                Create account →
              </Link>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-10 py-12">{children}</div>
      </main>
    </div>
  );
}
