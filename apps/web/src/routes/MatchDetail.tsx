import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { apiFetch, ApiError } from "../lib/api";
import type { MatchEvent, MatchStats } from "@ai-fifa/shared/schemas";

type MatchRow = {
  id: string;
  home_id: string;
  away_id: string;
  kickoff_at: number;
  status: string;
  home_score: number | null;
  away_score: number | null;
  events: MatchEvent[] | null;
  stats: MatchStats | null;
};

type TeamRow = { id: string; name: string; rating: number; formation: string };

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showAll, setShowAll] = useState(false);

  const matchQ = useQuery({
    queryKey: ["match", id],
    queryFn: async () => (await apiFetch<unknown>(`/api/v1/matches/${id}`)) as MatchRow,
    enabled: !!id,
  });

  const teamsQ = useQuery({
    queryKey: ["teams", "all"],
    queryFn: async () => (await apiFetch<unknown>("/api/v1/teams?limit=200")) as TeamRow[],
    enabled: !!matchQ.data,
  });

  const simulate = useMutation({
    mutationFn: async () => apiFetch<MatchRow>(`/api/v1/matches/${id}/simulate`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["match", id] });
      qc.invalidateQueries({ queryKey: ["matches"] });
      toast.success("Match simulated");
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(`${err.code}: ${err.message}`);
      else toast.error(String(err));
    },
  });

  if (matchQ.isLoading) return <p className="text-slate-400">Loading…</p>;
  if (matchQ.isError) return <p className="text-red-400">Failed to load match</p>;
  const m = matchQ.data!;
  const home = teamsQ.data?.find((t) => t.id === m.home_id);
  const away = teamsQ.data?.find((t) => t.id === m.away_id);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">{m.status}</p>
          <h1 className="text-2xl font-bold mt-1">
            {home?.name ?? m.home_id.slice(0, 8)} vs {away?.name ?? m.away_id.slice(0, 8)}
          </h1>
          <p className="text-sm text-slate-400">{new Date(m.kickoff_at).toLocaleString()}</p>
        </div>
        {m.status === "scheduled" && (
          <button
            type="button"
            onClick={() => simulate.mutate()}
            disabled={simulate.isPending}
            className="px-4 py-2 rounded-md bg-emerald-500 text-slate-950 font-medium hover:bg-emerald-400 disabled:opacity-50"
          >
            {simulate.isPending ? "Simulating…" : "Simulate now"}
          </button>
        )}
      </header>

      {m.status === "finished" && (
        <div className="rounded-2xl bg-pitch/90 p-6 flex items-center justify-center gap-6">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-slate-200/80">Home</p>
            <p className="text-lg font-semibold">{home?.name ?? "—"}</p>
            {home && <p className="text-xs text-slate-200/70">ELO {home.rating}</p>}
          </div>
          <p className="text-5xl font-mono font-bold">
            {m.home_score} <span className="text-slate-300/60">·</span> {m.away_score}
          </p>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-200/80">Away</p>
            <p className="text-lg font-semibold">{away?.name ?? "—"}</p>
            {away && <p className="text-xs text-slate-200/70">ELO {away.rating}</p>}
          </div>
        </div>
      )}

      {m.stats && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-lg font-semibold mb-3">Stats</h2>
          <StatRow label="Possession" home={m.stats.home_possession} away={m.stats.away_possession} suffix="%" />
          <StatRow label="Shots" home={m.stats.home_shots} away={m.stats.away_shots} />
          <StatRow label="On target" home={m.stats.home_shots_on_target} away={m.stats.away_shots_on_target} />
          <StatRow label="Corners" home={m.stats.home_corners} away={m.stats.away_corners} />
          <StatRow label="Fouls" home={m.stats.home_fouls} away={m.stats.away_fouls} />
          <StatRow label="Yellow" home={m.stats.home_yellow} away={m.stats.away_yellow} />
          <StatRow label="Red" home={m.stats.home_red} away={m.stats.away_red} />
        </section>
      )}

      {m.events && m.events.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Events</h2>
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              {showAll ? "Show key events" : "Show all"}
            </button>
          </div>
          <ol className="space-y-1 text-sm">
            {(showAll ? m.events : m.events.filter((e) => ["kickoff", "goal", "halftime", "fulltime", "card"].includes(e.type))).map((e, i) => (
              <li key={i} className="rounded border border-slate-800/50 bg-slate-900/30 px-3 py-1.5 flex items-center gap-3">
                <span className="text-xs text-slate-500 w-8 text-right">{e.t}'</span>
                <EventDescription e={e} homeName={home?.name} awayName={away?.name} />
              </li>
            ))}
          </ol>
        </section>
      )}

      {!home && !away && (
        <p className="text-xs text-slate-500">
          <Link to="/dashboard" className="text-emerald-400 hover:underline">
            Create a team
          </Link>{" "}
          and{" "}
          <Link to="/api-keys" className="text-emerald-400 hover:underline">
            generate an API key
          </Link>{" "}
          to start playing.
        </p>
      )}
    </div>
  );
}

function StatRow({
  label,
  home,
  away,
  suffix = "",
}: {
  label: string;
  home: number;
  away: number;
  suffix?: string;
}) {
  return (
    <div className="grid grid-cols-3 items-center py-1.5 text-sm">
      <span className="text-right font-mono">
        {home}
        {suffix}
      </span>
      <span className="text-center text-slate-500 text-xs uppercase tracking-wider">{label}</span>
      <span className="text-left font-mono">
        {away}
        {suffix}
      </span>
    </div>
  );
}

function EventDescription({
  e,
  homeName,
  awayName,
}: {
  e: MatchEvent;
  homeName?: string;
  awayName?: string;
}) {
  switch (e.type) {
    case "kickoff":
      return <span>⏱️ Kickoff — {e.team === "home" ? homeName : awayName}</span>;
    case "halftime":
      return <span>⏸️ Halftime · {e.score[0]}–{e.score[1]}</span>;
    case "fulltime":
      return <span>🏁 Fulltime · {e.score[0]}–{e.score[1]}</span>;
    case "goal":
      return (
        <span>
          ⚽ <strong>{e.scorer}</strong>
          {e.assist && <span className="text-slate-400"> (assist {e.assist})</span>}{" "}
          <span className="text-slate-500">[{e.team === "home" ? homeName : awayName}]</span>
        </span>
      );
    case "shot":
      return (
        <span className="text-slate-400">
          🎯 Shot by {e.taker} {e.on_target ? "(on target)" : "(off target)"}{" "}
          <span className="text-slate-600">xG {e.xg.toFixed(2)}</span>
        </span>
      );
    case "card":
      return (
        <span>
          {e.color === "red" ? "🟥" : "🟨"} {e.player}
        </span>
      );
    case "foul":
      return <span className="text-slate-400">⚠️ Foul by {e.player}</span>;
    case "attack":
      return (
        <span className="text-slate-500">
          ↗️ Attack {e.success ? "succeeded" : "broken"}
        </span>
      );
    case "possession":
    case "possession_update":
      return <span className="text-slate-500">📊 Possession {e.type === "possession_update" ? `${e.home}–${e.away}` : e.team}</span>;
    case "substitution":
      return <span className="text-slate-500">🔁 {e.out} → {e.in_}</span>;
    default:
      return <span>{JSON.stringify(e)}</span>;
  }
}
