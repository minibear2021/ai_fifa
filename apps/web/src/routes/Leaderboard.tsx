import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

type TeamRow = {
  id: string;
  name: string;
  formation: string;
  rating: number;
  owner_name: string | null;
};

export default function Leaderboard() {
  const q = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => (await apiFetch<unknown>("/api/v1/teams?limit=50")) as TeamRow[],
  });

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Rankings</p>
        <h1 className="font-display text-display-lg text-paper mt-2">Leaderboard</h1>
        <p className="text-muted text-sm mt-2">Top 50 teams by ELO. Updated after every match.</p>
      </header>

      {q.isLoading && <p className="text-dim text-sm">Loading…</p>}
      {q.data && q.data.length === 0 && (
        <p className="text-dim text-sm">No teams yet. Be the first.</p>
      )}

      <div className="border border-line bg-panel rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line">
              <th className="eyebrow text-left px-5 py-3 w-12">#</th>
              <th className="eyebrow text-left px-3 py-3">Team</th>
              <th className="eyebrow text-left px-3 py-3">Coach</th>
              <th className="eyebrow text-left px-3 py-3">Formation</th>
              <th className="eyebrow text-right px-5 py-3">ELO</th>
            </tr>
          </thead>
          <tbody className="font-data text-[13px]">
            {(q.data ?? []).map((t, i) => {
              const rank = i + 1;
              const isTop = rank <= 3;
              return (
                <tr
                  key={t.id}
                  className="border-b border-line last:border-0 hover:bg-panel-2 transition-colors"
                >
                  <td
                    className={`px-5 py-3 ${
                      isTop ? "text-pitch font-display text-xl" : "text-dim"
                    } tabular-nums`}
                  >
                    {rank.toString().padStart(2, "0")}
                  </td>
                  <td className="px-3 py-3 text-paper font-body text-sm">
                    <Link to={`/team/${t.id}`} className="hover:text-pitch-glow">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {t.owner_name ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-muted">{t.formation}</td>
                  <td
                    className={`px-5 py-3 text-right tabular-nums ${
                      isTop ? "text-pitch" : "text-paper"
                    }`}
                  >
                    {t.rating}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
