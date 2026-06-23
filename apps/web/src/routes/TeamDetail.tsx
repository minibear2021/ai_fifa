import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "../lib/api";
import {
  playerSchema,
  strategySchema,
  formationSchema,
  type Player,
  type Strategy,
  type Formation,
} from "@ai-fifa/shared/schemas";
import { Field, inputClass } from "../components/Field";

type TeamDetail = {
  team: { id: string; name: string; formation: string; rating: number; created_at: number };
  players: Player[];
  strategy: Strategy | null;
};

const strategyFormSchema = z.object({
  formation: formationSchema,
  style: z.enum(["possession", "counter-attack", "pressing", "direct", "park-the-bus"]),
  mentality: z.enum(["defensive", "cautious", "balanced", "attacking", "all-out"]),
  pressing: z.number().int().min(0).max(100),
  passing_risk: z.number().int().min(0).max(100),
  width: z.number().int().min(0).max(100),
  fouls_tactical: z.boolean(),
});
type StrategyForm = z.infer<typeof strategyFormSchema>;

const FORMATIONS: Formation[] = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2", "3-4-3"];

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const detailQ = useQuery({
    queryKey: ["team", id],
    queryFn: async () => {
      const raw = (await apiFetch<unknown>(`/api/v1/me/teams/${id}`)) as TeamDetail;
      return raw;
    },
    enabled: !!id,
  });

  const upcomingQ = useQuery({
    queryKey: ["team", id, "upcoming-matches"],
    queryFn: async () => {
      const all = (await apiFetch<unknown>(`/api/v1/matches?status=scheduled&limit=200`)) as Array<{
        id: string;
        home_id: string;
        away_id: string;
        kickoff_at: number;
      }>;
      return all.filter((m) => (m.home_id === id || m.away_id === id) && m.kickoff_at > Date.now());
    },
    enabled: !!id,
  });

  const updateStrategy = useMutation({
    mutationFn: async (body: StrategyForm) => {
      return apiFetch<Strategy>(`/api/v1/me/teams/${id}/strategy`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", id] });
      toast.success("Strategy updated");
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(`${err.code}: ${err.message}`);
      else toast.error(String(err));
    },
  });

  if (detailQ.isLoading) return <p className="text-slate-400">Loading…</p>;
  if (detailQ.isError) return <p className="text-red-400">Failed to load team</p>;
  const data = detailQ.data!;

  const nextMatch = (upcomingQ.data ?? []).sort((a, b) => a.kickoff_at - b.kickoff_at)[0];
  const lockMs = 30 * 60 * 1000;
  const isLocked = nextMatch && nextMatch.kickoff_at - Date.now() < lockMs;

  const playersByPos = (data.players ?? []).reduce<Record<string, Player[]>>((acc, p) => {
    (acc[p.position] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-wider text-slate-500">{data.team.formation}</p>
        <h1 className="text-3xl font-bold">{data.team.name}</h1>
        <p className="text-slate-400 text-sm mt-1">ELO {data.team.rating}</p>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-3">Squad</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(["GK", "DF", "MF", "FW"] as const).map((pos) => (
            <div key={pos} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                {pos} · {playersByPos[pos]?.length ?? 0}
              </p>
              <ul className="space-y-1">
                {(playersByPos[pos] ?? []).map((p) => (
                  <li key={p.id} className="text-sm flex items-center justify-between">
                    <span>{p.name}</span>
                    <span className="text-slate-500 text-xs">OVR {p.overall}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {data.strategy && (
        <StrategyEditor
          initial={data.strategy}
          locked={!!isLocked}
          lockedUntil={isLocked ? new Date(nextMatch!.kickoff_at).toLocaleString() : null}
          onSubmit={(v) => updateStrategy.mutate(v)}
          submitting={updateStrategy.isPending}
        />
      )}
    </div>
  );
}

function StrategyEditor({
  initial,
  locked,
  lockedUntil,
  onSubmit,
  submitting,
}: {
  initial: Strategy;
  locked: boolean;
  lockedUntil: string | null;
  onSubmit: (v: StrategyForm) => void;
  submitting: boolean;
}) {
  const { register, handleSubmit, watch, reset, formState: { errors, isDirty } } = useForm<StrategyForm>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues: {
      formation: initial.formation,
      style: initial.style,
      mentality: initial.mentality,
      pressing: initial.pressing,
      passing_risk: initial.passing_risk,
      width: initial.width,
      fouls_tactical: initial.fouls_tactical,
    },
  });
  useEffect(() => {
    reset({
      formation: initial.formation,
      style: initial.style,
      mentality: initial.mentality,
      pressing: initial.pressing,
      passing_risk: initial.passing_risk,
      width: initial.width,
      fouls_tactical: initial.fouls_tactical,
    });
  }, [initial, reset]);

  const w = watch();

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Strategy</h2>
      {locked && (
        <div className="rounded-md border border-amber-700/50 bg-amber-950/40 text-amber-200 text-sm p-3 mb-4">
          Strategy is locked — next match starts at {lockedUntil}.
        </div>
      )}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4"
      >
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Formation" error={errors.formation?.message}>
            <select {...register("formation")} className={inputClass} disabled={locked}>
              {FORMATIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Style" error={errors.style?.message}>
            <select {...register("style")} className={inputClass} disabled={locked}>
              <option value="possession">possession</option>
              <option value="counter-attack">counter-attack</option>
              <option value="pressing">pressing</option>
              <option value="direct">direct</option>
              <option value="park-the-bus">park-the-bus</option>
            </select>
          </Field>
          <Field label="Mentality" error={errors.mentality?.message}>
            <select {...register("mentality")} className={inputClass} disabled={locked}>
              <option value="defensive">defensive</option>
              <option value="cautious">cautious</option>
              <option value="balanced">balanced</option>
              <option value="attacking">attacking</option>
              <option value="all-out">all-out</option>
            </select>
          </Field>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <RangeField label="Pressing" name="pressing" value={w.pressing} register={register} disabled={locked} />
          <RangeField label="Passing risk" name="passing_risk" value={w.passing_risk} register={register} disabled={locked} />
          <RangeField label="Width" name="width" value={w.width} register={register} disabled={locked} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("fouls_tactical")} disabled={locked} />
          <span>Tactical fouls (more cards, more disruption)</span>
        </label>

        <button
          type="submit"
          disabled={locked || !isDirty || submitting}
          className="px-4 py-2 rounded-md bg-emerald-500 text-slate-950 font-medium hover:bg-emerald-400 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save strategy"}
        </button>
      </form>
    </section>
  );
}

function RangeField({
  label,
  name,
  value,
  register,
  disabled,
}: {
  label: string;
  name: keyof StrategyForm;
  value: number;
  register: ReturnType<typeof useForm<StrategyForm>>["register"];
  disabled: boolean;
}) {
  return (
    <Field label={`${label} · ${value}`}>
      <input
        type="range"
        min={0}
        max={100}
        {...register(name, { valueAsNumber: true })}
        disabled={disabled}
        className="w-full"
      />
    </Field>
  );
}
