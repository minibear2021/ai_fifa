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
    queryKey: ["public-teams"],
    queryFn: async () => (await apiFetch<unknown>("/api/v1/teams?limit=200")) as TeamRow[],
  });

  const teamName = (id: string) => teamsQ.data?.find((t) => t.id === id)?.name ?? id.slice(0, 6);

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Matchday</p>
        <h1 className="font-display text-display-lg text-paper mt-2">Matches</h1>
      </header>

      <div className="flex items-center gap-6 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-3 -mb-px text-sm transition-colors border-b-2 ${
              tab === t.id
                ? "text-paper border-pitch"
                : "text-muted border-transparent hover:text-paper"
            }`}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {matchesQ.isLoading && <p className="text-dim text-sm">Loading…</p>}
      {matchesQ.data && matchesQ.data.length === 0 && (
        <p className="text-dim text-sm">No matches.</p>
      )}

      <div className="border border-line bg-panel rounded-lg divide-y divide-line">
        {(matchesQ.data ?? []).map((m) => (
          <Link
            key={m.id}
            to={`/matches/${m.id}`}
            className="grid grid-cols-12 items-center px-5 py-4 hover:bg-panel-2 transition-colors"
          >
            <span className="col-span-1 eyebrow tabular-nums">M{m.id.slice(0, 4)}</span>
            <span className="col-span-4 text-sm text-paper truncate">
              {teamName(m.home_id)}
            </span>
            <span className="col-span-2 font-data text-2xl text-paper text-center tabular-nums">
              {m.status === "finished" ? `${m.home_score}–${m.away_score}` : "·"}
            </span>
            <span className="col-span-4 text-sm text-paper text-right truncate">
              {teamName(m.away_id)}
            </span>
            <span className="col-span-1 eyebrow text-dim text-right uppercase tracking-eyebrow">
              {m.status === "finished" ? "FT" : m.kickoff_at > Date.now() ? "SCH" : "—" }
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
