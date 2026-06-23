import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { seasonSchema } from "@ai-fifa/shared/schemas";
import { useCurrentUser } from "../lib/auth";

type TeamRow = { id: string; name: string; rating: number; owner_name: string | null; formation: string };
type MatchRow = { id: string; home_id: string; away_id: string; kickoff_at: number; status: string; home_score: number | null; away_score: number | null };

export default function Home() {
  const me = useCurrentUser();
  const season = useQuery({
    queryKey: ["season", "current"],
    queryFn: async () => {
      const raw = await apiFetch<unknown>("/api/v1/seasons/current");
      return seasonSchema.parse(raw);
    },
  });

  const teams = useQuery({
    queryKey: ["public-teams"],
    queryFn: async () => (await apiFetch<unknown>("/api/v1/teams?limit=100")) as TeamRow[],
  });

  const matches = useQuery({
    queryKey: ["public-matches"],
    queryFn: async () => (await apiFetch<unknown>("/api/v1/matches?limit=20")) as MatchRow[],
  });

  const finished = matches.data?.filter((m) => m.status === "finished") ?? [];
  const scheduled = matches.data?.filter((m) => m.status === "scheduled") ?? [];
  const topThree = [...(teams.data ?? [])].sort((a, b) => b.rating - a.rating).slice(0, 3);
  const teamName = (id: string) => teams.data?.find((t) => t.id === id)?.name ?? id.slice(0, 6);

  return (
    <div className="space-y-16">
      <header className="space-y-6">
        <p className="eyebrow">Tactical Operations · Season {season.data?.name ?? "—"}</p>
        <h1 className="font-display text-display-xl text-paper leading-[1.04] tracking-[-0.025em] max-w-3xl">
          Your AI runs the pitch.<br />
          <span className="italic text-muted">You set the tactics.</span>
        </h1>
        <p className="text-muted max-w-xl text-[15px] leading-relaxed">
          Every team is controlled by an autonomous agent. You script the strategy, your agent plays
          the match. The strongest tactics win, week after week.
        </p>
        <div className="flex items-center gap-3 pt-2">
          {me.data ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center h-10 px-5 rounded-md bg-pitch text-ink font-body text-sm font-medium hover:bg-pitch-glow transition-colors"
            >
              Open dashboard →
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="inline-flex items-center h-10 px-5 rounded-md bg-pitch text-ink font-body text-sm font-medium hover:bg-pitch-glow transition-colors"
              >
                Create account
              </Link>
              <Link
                to="/matches"
                className="inline-flex items-center h-10 px-5 text-paper/80 hover:text-paper font-body text-sm"
              >
                Browse matches →
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="grid grid-cols-3 gap-px bg-line border border-line rounded-lg overflow-hidden">
        <StatCell label="Teams" value={teams.data?.length ?? "—"} hint="across all coaches" />
        <StatCell label="Matches" value={matches.data?.length ?? "—"} hint={`${finished.length} finished · ${scheduled.length} scheduled`} />
        <StatCell
          label="Top ELO"
          value={topThree[0]?.rating ?? "—"}
          hint={topThree[0]?.name ?? "no teams yet"}
        />
      </section>

      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-7 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl text-paper">Recent results</h2>
            <Link to="/matches" className="text-sm text-muted hover:text-paper">
              All matches →
            </Link>
          </div>
          <div className="border border-line rounded-lg divide-y divide-line bg-panel">
            {finished.length === 0 && (
              <p className="px-5 py-6 text-dim text-sm">No finished matches yet.</p>
            )}
            {finished.slice(0, 5).map((m) => (
              <Link
                key={m.id}
                to={`/matches/${m.id}`}
                className="grid grid-cols-12 items-center px-5 py-4 hover:bg-panel-2 transition-colors"
              >
                <span className="col-span-1 eyebrow tabular-nums">M{m.id.slice(0, 4)}</span>
                <span className="col-span-4 text-sm text-paper truncate">{teamName(m.home_id)}</span>
                <span className="col-span-2 font-data text-2xl text-paper text-center tabular-nums">
                  {m.home_score}–{m.away_score}
                </span>
                <span className="col-span-4 text-sm text-paper text-right truncate">
                  {teamName(m.away_id)}
                </span>
                <span className="col-span-1 eyebrow text-dim text-right">FT</span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="col-span-5 space-y-4">
          <h2 className="font-display text-2xl text-paper">Top of the table</h2>
          <div className="border border-line rounded-lg overflow-hidden">
            {topThree.length === 0 && (
              <p className="px-5 py-6 text-dim text-sm">No teams yet.</p>
            )}
            {topThree.map((t, i) => (
              <div
                key={t.id}
                className="flex items-center gap-4 px-5 py-4 border-b border-line last:border-0 bg-panel"
              >
                <span className="font-display text-2xl text-pitch w-6 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-paper truncate">{t.name}</p>
                  <p className="eyebrow mt-0.5">
                    {t.owner_name ?? "—"} · {t.formation}
                  </p>
                </div>
                <span className="font-data text-lg text-paper tabular-nums">{t.rating}</span>
              </div>
            ))}
          </div>
          <Link
            to="/leaderboard"
            className="block text-sm text-muted hover:text-paper text-right"
          >
            Full leaderboard →
          </Link>
        </aside>
      </section>
    </div>
  );
}

function StatCell({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-panel px-6 py-5">
      <p className="eyebrow">{label}</p>
      <p className="font-display text-3xl text-paper mt-2 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}
