import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { apiFetch, ApiError } from "../lib/api";
import { teamSchema, type Team, formationSchema } from "@ai-fifa/shared/schemas";
import { Field, inputClass } from "../components/Field";

const createSchema = z.object({
  name: z.string().min(1, "Required").max(64),
  formation: formationSchema,
});
type CreateForm = z.infer<typeof createSchema>;

type TeamRow = {
  id: string;
  user_id: string;
  season_id: string | null;
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
    queryFn: async () => {
      const raw = (await apiFetch<unknown>("/api/v1/me/teams")) as TeamRow[];
      return raw;
    },
  });

  const matchesQ = useQuery({
    queryKey: ["matches", "upcoming"],
    queryFn: async () => {
      const raw = (await apiFetch<unknown>("/api/v1/matches?status=scheduled&limit=20")) as MatchRow[];
      return raw.filter((m) => m.kickoff_at > Date.now());
    },
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
  const myUpcoming = (matchesQ.data ?? []).filter(
    (m) => myTeamIds.has(m.home_id) || myTeamIds.has(m.away_id),
  );

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">My teams</h2>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="px-3 py-1.5 rounded-md bg-emerald-500 text-slate-950 text-sm font-medium hover:bg-emerald-400"
            type="button"
          >
            {showCreate ? "Cancel" : "Create team"}
          </button>
        </div>
        {showCreate && (
          <CreateTeamForm
            onSubmit={(v) => create.mutate(v)}
            submitting={create.isPending}
          />
        )}
        {teamsQ.isLoading && <p className="text-slate-400">Loading…</p>}
        {teamsQ.data && teamsQ.data.length === 0 && (
          <p className="text-slate-500">No teams yet. Create one to get started.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(teamsQ.data ?? []).map((t) => (
            <Link
              key={t.id}
              to={`/team/${t.id}`}
              className="block rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-emerald-500/50 transition"
            >
              <p className="text-xs uppercase tracking-wider text-slate-500">{t.formation}</p>
              <p className="text-lg font-semibold mt-1">{t.name}</p>
              <p className="text-sm text-slate-400 mt-2">ELO {t.rating}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Upcoming matches</h2>
        {matchesQ.isLoading && <p className="text-slate-400">Loading…</p>}
        {myUpcoming.length === 0 && !matchesQ.isLoading && (
          <p className="text-slate-500">No upcoming matches for your teams.</p>
        )}
        <div className="space-y-2">
          {myUpcoming.map((m) => {
            const isHome = myTeamIds.has(m.home_id);
            return (
              <Link
                key={m.id}
                to={`/matches/${m.id}`}
                className="block rounded-lg border border-slate-800 bg-slate-900/40 p-3 hover:border-emerald-500/50 transition"
              >
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {isHome ? "🏠" : "✈️"}{" "}
                    {new Date(m.kickoff_at).toLocaleString()}
                  </span>
                  <span className="text-slate-500">{m.status}</span>
                </div>
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
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 mb-4 grid gap-3 sm:grid-cols-3"
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
          className="w-full py-2 rounded-md bg-emerald-500 text-slate-950 font-medium hover:bg-emerald-400 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}
