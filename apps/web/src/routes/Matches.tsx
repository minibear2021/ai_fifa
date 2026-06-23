import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

type MatchRow = {
  id: string;
  home_id: string;
  away_id: string;
  kickoff_at: number;
  status: string;
  home_score: number | null;
  away_score: number | null;
};

type TeamRow = { id: string; name: string };

const TABS = [
  { id: "all", label: "All" },
  { id: "scheduled", label: "Scheduled" },
  { id: "finished", label: "Finished" },
] as const;
type TabId = typeof TABS[number]["id"];

export default function Matches() {
  const [tab, setTab] = useState<TabId>("all");
  const status = tab === "all" ? "" : `?status=${tab}`;

  const matchesQ = useQuery({
    queryKey: ["matches", tab],
    queryFn: async () => (await apiFetch<unknown>(`/api/v1/matches${status}`)) as MatchRow[],
  });

  const teamsQ = useQuery({
    queryKey: ["teams", "all"],
    queryFn: async () => (await apiFetch<unknown>("/api/v1/teams?limit=200")) as TeamRow[],
    enabled: false,
  });

  const teamName = (id: string) => teamsQ.data?.find((t) => t.id === id)?.name ?? id.slice(0, 8);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Matches</h1>
      </header>
      <div className="flex gap-1 border-b border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px ${
              tab === t.id
                ? "border-emerald-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>
      {matchesQ.isLoading && <p className="text-slate-400">Loading…</p>}
      {matchesQ.data && matchesQ.data.length === 0 && (
        <p className="text-slate-500">No matches.</p>
      )}
      <div className="space-y-2">
        {(matchesQ.data ?? []).map((m) => (
          <Link
            key={m.id}
            to={`/matches/${m.id}`}
            className="block rounded-lg border border-slate-800 bg-slate-900/40 p-3 hover:border-emerald-500/50 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-300">
                  {teamName(m.home_id)} <span className="text-slate-500">vs</span> {teamName(m.away_id)}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(m.kickoff_at).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                {m.status === "finished" ? (
                  <p className="text-2xl font-mono font-semibold">
                    {m.home_score} <span className="text-slate-600">·</span> {m.away_score}
                  </p>
                ) : (
                  <span className="text-xs uppercase tracking-wider text-slate-500">
                    {m.status}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
