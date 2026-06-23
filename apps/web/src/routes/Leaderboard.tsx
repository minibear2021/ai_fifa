import { useQuery } from "@tanstack/react-query";
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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-slate-400 text-sm">Top 50 teams by ELO.</p>
      </header>
      {q.isLoading && <p className="text-slate-400">Loading…</p>}
      {q.data && q.data.length === 0 && (
        <p className="text-slate-500">No teams yet. Be the first.</p>
      )}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Team</th>
              <th className="px-4 py-2 text-left">Coach</th>
              <th className="px-4 py-2 text-left">Formation</th>
              <th className="px-4 py-2 text-right">ELO</th>
            </tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((t, i) => (
              <tr key={t.id} className="border-t border-slate-800 hover:bg-slate-900/30">
                <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                <td className="px-4 py-2 font-medium">{t.name}</td>
                <td className="px-4 py-2 text-slate-400">{t.owner_name ?? "—"}</td>
                <td className="px-4 py-2 text-slate-400">{t.formation}</td>
                <td className="px-4 py-2 text-right font-mono">{t.rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
