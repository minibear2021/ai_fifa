import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { apiFetch, ApiError } from "../lib/api";
import { formationSchema } from "@ai-fifa/shared/schemas";
import { Field, inputClass } from "../components/Field";

const createSchema = z.object({
  name: z.string().min(1, "Required").max(64),
  formation: formationSchema,
});
type CreateForm = z.infer<typeof createSchema>;

type TeamRow = {
  id: string;
  name: string;
  formation: string;
  rating: number;
  created_at: number;
};
type MatchRow = {
  id: string;
  home_id: string;
  away_id: string;
  kickoff_at: number;
  status: string;
  home_score: number | null;
  away_score: number | null;
};

export default function Dashboard() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const teamsQ = useQuery({
    queryKey: ["me", "teams"],
    queryFn: async () => (await apiFetch<unknown>("/api/v1/me/teams")) as TeamRow[],
  });

  const matchesQ = useQuery({
    queryKey: ["matches", "scheduled"],
    queryFn: async () => {
      const all = (await apiFetch<unknown>("/api/v1/matches?status=scheduled&limit=50")) as MatchRow[];
      return all.filter((m) => m.kickoff_at > Date.now());
    },
  });

  const teamsMapQ = useQuery({
    queryKey: ["public-teams"],
    queryFn: async () => (await apiFetch<unknown>("/api/v1/teams?limit=200")) as TeamRow[],
    enabled: !!matchesQ.data,
  });

  const create = useMutation({
    mutationFn: async (body: CreateForm) => {
      return apiFetch<TeamRow>("/api/v1/me/teams", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "teams"] });
      setShowCreate(false);
      toast.success("Team created");
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error(String(err));
    },
  });

  const myTeamIds = new Set((teamsQ.data ?? []).map((t) => t.id));
  const teamName = (id: string) => teamsMapQ.data?.find((t) => t.id === id)?.name ?? id.slice(0, 6);
  const myUpcoming = (matchesQ.data ?? []).filter(
    (m) => myTeamIds.has(m.home_id) || myTeamIds.has(m.away_id),
  );

  return (
    <div className="space-y-12">
      <header className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="font-display text-display-lg text-paper mt-2">Operations</h1>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center h-10 px-4 rounded-md border border-line bg-panel hover:bg-panel-2 text-sm text-paper transition-colors"
          type="button"
        >
          {showCreate ? "Cancel" : "New team"}
        </button>
      </header>

      {showCreate && (
        <CreateTeamForm
          onSubmit={(v) => create.mutate(v)}
          submitting={create.isPending}
        />
      )}

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl text-paper">Your teams</h2>
          <span className="eyebrow">{(teamsQ.data ?? []).length} active</span>
        </div>
        {teamsQ.isLoading && <p className="text-dim text-sm">Loading…</p>}
        {teamsQ.data && teamsQ.data.length === 0 && (
          <div className="border border-dashed border-line rounded-lg px-6 py-12 text-center">
            <p className="text-muted text-sm">No teams yet. Create one to get started.</p>
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(teamsQ.data ?? []).map((t) => (
            <Link
              key={t.id}
              to={`/team/${t.id}`}
              className="block border border-line bg-panel rounded-lg p-5 hover:border-paper/20 transition-colors"
            >
              <div className="flex items-baseline justify-between">
                <p className="eyebrow">{t.formation}</p>
                <p className="font-data text-xs text-dim">ELO</p>
              </div>
              <p className="font-display text-xl text-paper mt-3 leading-tight">{t.name}</p>
              <p className="font-data text-2xl text-paper mt-4 tabular-nums">{t.rating}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-paper">Upcoming matches</h2>
        {matchesQ.isLoading && <p className="text-dim text-sm">Loading…</p>}
        {myUpcoming.length === 0 && !matchesQ.isLoading && (
          <p className="text-dim text-sm">No upcoming matches for your teams.</p>
        )}
        <div className="border border-line rounded-lg divide-y divide-line bg-panel">
          {myUpcoming.map((m) => {
            const isHome = myTeamIds.has(m.home_id);
            return (
              <Link
                key={m.id}
                to={`/matches/${m.id}`}
                className="grid grid-cols-12 items-center px-5 py-4 hover:bg-panel-2 transition-colors"
              >
                <span className="col-span-1 eyebrow tabular-nums">M{m.id.slice(0, 4)}</span>
                <span className="col-span-4 text-sm text-paper truncate">
                  {isHome ? "vs" : "@"} {teamName(isHome ? m.away_id : m.home_id)}
                </span>
                <span className="col-span-3 eyebrow">
                  {new Date(m.kickoff_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="col-span-3 eyebrow text-dim text-right uppercase tracking-eyebrow">
                  {m.status}
                </span>
                <span className="col-span-1 text-right text-paper/40">→</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CreateTeamForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (v: CreateForm) => void;
  submitting: boolean;
}) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { formation: "4-4-2" },
  });
  return (
    <form
      onSubmit={handleSubmit((v) => {
        onSubmit(v);
        reset();
      })}
      className="border border-line bg-panel rounded-lg p-5 grid gap-3 sm:grid-cols-3"
    >
      <Field label="Team name" error={errors.name?.message}>
        <input {...register("name")} className={inputClass} placeholder="Red Lions" />
      </Field>
      <Field label="Formation" error={errors.formation?.message}>
        <select {...register("formation")} className={inputClass}>
          {formationSchema.options.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={submitting}
          className="w-full h-10 rounded-md bg-pitch text-ink font-body text-sm font-medium hover:bg-pitch-glow disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create team"}
        </button>
      </div>
    </form>
  );
}
