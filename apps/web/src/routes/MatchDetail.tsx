import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { apiFetch, ApiError } from "../lib/api";
import type { MatchEvent, MatchStats, Formation } from "@ai-fifa/shared/schemas";
import { Pitch } from "../components/Pitch";
import { MatchTicker } from "../components/MatchTicker";

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

  const matchQ = useQuery({
    queryKey: ["match", id],
    queryFn: async () => (await apiFetch<unknown>(`/api/v1/matches/${id}`)) as MatchRow,
    enabled: !!id,
  });

  const teamsQ = useQuery({
    queryKey: ["public-teams"],
    queryFn: async () => (await apiFetch<unknown>("/api/v1/teams?limit=200")) as TeamRow[],
    enabled: !!matchQ.data,
  });

  const simulate = useMutation({
    mutationFn: async () => apiFetch<MatchRow>(`/api/v1/matches/${id}/simulate`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["match", id] });
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["public-teams"] });
      toast.success("Match simulated");
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(`${err.code}: ${err.message}`);
      else toast.error(String(err));
    },
  });

  if (matchQ.isLoading) return <p className="text-dim text-sm">Loading…</p>;
  if (matchQ.isError) return <p className="text-card text-sm">Failed to load match</p>;
  const m = matchQ.data!;
  const home = teamsQ.data?.find((t) => t.id === m.home_id);
  const away = teamsQ.data?.find((t) => t.id === m.away_id);
  const homeName = home?.name ?? m.home_id.slice(0, 6);
  const awayName = away?.name ?? m.away_id.slice(0, 6);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-baseline gap-4">
            <p className="eyebrow">Match {m.id.slice(0, 8)}</p>
            <p className="eyebrow text-dim">
              {new Date(m.kickoff_at).toLocaleString()}
            </p>
          </div>
          <h1 className="font-display text-display-lg text-paper leading-none">
            <Link to={`/team/${m.home_id}`} className="hover:text-pitch-glow transition-colors">
              {homeName}
            </Link>
            <span className="text-dim mx-3">vs</span>
            <Link to={`/team/${m.away_id}`} className="hover:text-pitch-glow transition-colors">
              {awayName}
            </Link>
          </h1>
        </div>
        {m.status === "scheduled" && (
          <button
            type="button"
            onClick={() => simulate.mutate()}
            disabled={simulate.isPending}
            className="h-10 px-5 rounded-md bg-pitch text-ink font-body text-sm font-medium hover:bg-pitch-glow disabled:opacity-50"
          >
            {simulate.isPending ? "Simulating…" : "Simulate now"}
          </button>
        )}
      </header>

      {m.events && m.events.length > 0 && (
        <MatchTicker events={m.events} homeName={homeName} awayName={awayName} />
      )}

      {m.status === "finished" && (
        <section className="grid grid-cols-12 gap-6 items-center border border-line bg-panel rounded-lg px-8 py-8">
          <div className="col-span-5 text-right">
            <p className="eyebrow">Home</p>
            <p className="font-display text-3xl text-paper mt-2">{homeName}</p>
            {home && (
              <p className="font-data text-sm text-dim mt-1">ELO {home.rating}</p>
            )}
          </div>
          <div className="col-span-2 text-center">
            <p className="font-data text-display-2xl text-paper tabular-nums">
              {m.home_score}–{m.away_score}
            </p>
            <p className="eyebrow mt-2 text-pitch">Full time</p>
          </div>
          <div className="col-span-5">
            <p className="eyebrow">Away</p>
            <p className="font-display text-3xl text-paper mt-2">{awayName}</p>
            {away && (
              <p className="font-data text-sm text-dim mt-1">ELO {away.rating}</p>
            )}
          </div>
        </section>
      )}

      {home && away && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="eyebrow">Formations</h2>
            <span className="eyebrow text-dim">Home attacks →</span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-line border border-line rounded-lg overflow-hidden">
            <div className="bg-panel p-3">
              <div className="px-2 py-1 mb-1">
                <p className="font-data text-[11px] text-dim uppercase tracking-eyebrow">
                  {home.formation} · {homeName}
                </p>
              </div>
              <Pitch
                home={{
                  formation: home.formation as Formation,
                  primary: "#4FFF8B",
                  secondary: "#0C100D",
                }}
                size="md"
              />
            </div>
            <div className="bg-panel p-3">
              <div className="px-2 py-1 mb-1 text-right">
                <p className="font-data text-[11px] text-dim uppercase tracking-eyebrow">
                  {awayName} · {away.formation}
                </p>
              </div>
              <Pitch
                home={{
                  formation: away.formation as Formation,
                  primary: "#FFB84D",
                  secondary: "#0C100D",
                }}
                size="md"
              />
            </div>
          </div>
        </section>
      )}

      {m.stats && (
        <section className="space-y-3">
          <h2 className="eyebrow">Match stats</h2>
          <div className="border border-line bg-panel rounded-lg overflow-hidden">
            <StatRow label="Possession" home={m.stats.home_possession} away={m.stats.away_possession} suffix="%" />
            <StatRow label="Shots" home={m.stats.home_shots} away={m.stats.away_shots} />
            <StatRow label="On target" home={m.stats.home_shots_on_target} away={m.stats.away_shots_on_target} />
            <StatRow label="Corners" home={m.stats.home_corners} away={m.stats.away_corners} />
            <StatRow label="Fouls" home={m.stats.home_fouls} away={m.stats.away_fouls} />
            <StatRow label="Yellow" home={m.stats.home_yellow} away={m.stats.away_yellow} />
            <StatRow label="Red" home={m.stats.home_red} away={m.stats.away_red} />
          </div>
        </section>
      )}

      {m.events && m.events.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="eyebrow">Events</h2>
            <span className="eyebrow text-dim">All events</span>
          </div>
          <ol className="border border-line bg-panel rounded-lg divide-y divide-line">
            {m.events.map((e, i) => (
              <li
                key={i}
                className="grid grid-cols-12 items-center px-4 py-2.5 font-data text-[12px]"
              >
                <span className="col-span-1 text-dim tabular-nums">{String(e.t).padStart(2, "0")}'</span>
                <span className="col-span-3 text-muted uppercase tracking-eyebrow text-[10px]">
                  {e.type.replace("_", " ")}
                </span>
                <span className="col-span-8 text-paper">
                  {renderEvent(e, homeName, awayName)}
                </span>
              </li>
            ))}
          </ol>
        </section>
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
  const total = home + away || 1;
  return (
    <div className="grid grid-cols-12 items-center px-5 py-3 border-b border-line last:border-0">
      <span className="col-span-3 text-right font-data text-base text-paper tabular-nums">
        {home}
        {suffix}
      </span>
      <div className="col-span-6 px-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="eyebrow">{label}</span>
        </div>
        <div className="h-1 flex bg-line rounded-full overflow-hidden">
          <div
            className="h-full bg-pitch"
            style={{ width: `${(home / total) * 100}%` }}
          />
          <div
            className="h-full bg-muted"
            style={{ width: `${(away / total) * 100}%` }}
          />
        </div>
      </div>
      <span className="col-span-3 font-data text-base text-paper tabular-nums">
        {away}
        {suffix}
      </span>
    </div>
  );
}

function renderEvent(e: MatchEvent, home: string, away: string) {
  switch (e.type) {
    case "kickoff":
      return <>Kickoff — {e.team === "home" ? home : away}</>;
    case "halftime":
      return (
        <>
          <span className="eyebrow text-dim mr-2">Halftime</span>
          <span className="font-data text-base tabular-nums">
            {e.score[0]}–{e.score[1]}
          </span>
        </>
      );
    case "fulltime":
      return (
        <>
          <span className="eyebrow text-pitch mr-2">Fulltime</span>
          <span className="font-data text-base tabular-nums">
            {e.score[0]}–{e.score[1]}
          </span>
        </>
      );
    case "goal":
      return (
        <>
          <span className="text-pitch mr-2">⚽</span>
          <strong className="text-paper">{e.scorer}</strong>
          {e.assist && (
            <span className="text-muted">
              {" "}· assist {e.assist}
            </span>
          )}
          <span className="text-dim text-[10px] ml-2 uppercase tracking-eyebrow">
            {e.team === "home" ? home : away}
          </span>
        </>
      );
    case "card":
      return (
        <>
          <span
            className={`inline-block w-2 h-3 mr-2 ${
              e.color === "red" ? "bg-card" : "bg-amber"
            }`}
          />
          {e.player}
        </>
      );
    case "shot":
      return (
        <span className="text-muted">
          Shot by {e.taker} {e.on_target ? "(on target)" : ""}
        </span>
      );
    case "foul":
      return <span className="text-muted">Foul by {e.player}</span>;
    case "attack":
      return (
        <span className="text-dim">Attack {e.success ? "succeeds" : "broken"}</span>
      );
    case "possession":
    case "possession_update":
      return <span className="text-dim">Possession</span>;
    case "substitution":
      return (
        <span className="text-dim">
          Sub — {e.out} → {e.in_}
        </span>
      );
    default: {
      const _exhaustive: never = e;
      return <>event</>;
    }
  }
}
