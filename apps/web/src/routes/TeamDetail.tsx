import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "../lib/api";
import {
  formationSchema,
  type Player,
  type Strategy,
  type Formation,
} from "@ai-fifa/shared/schemas";
import { Field, inputClass } from "../components/Field";
import { Pitch } from "../components/Pitch";

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
    queryFn: async () => (await apiFetch<unknown>(`/api/v1/me/teams/${id}`)) as TeamDetail,
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
    mutationFn: async (body: StrategyForm) =>
      apiFetch<Strategy>(`/api/v1/me/teams/${id}/strategy`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", id] });
      toast.success("Strategy updated");
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(`${err.code}: ${err.message}`);
      else toast.error(String(err));
    },
  });

  if (detailQ.isLoading) return <p className="text-dim text-sm">Loading…</p>;
  if (detailQ.isError) return <p className="text-card text-sm">Failed to load team</p>;
  const data = detailQ.data!;

  const nextMatch = (upcomingQ.data ?? []).sort((a, b) => a.kickoff_at - b.kickoff_at)[0];
  const lockMs = 30 * 60 * 1000;
  const isLocked = nextMatch && nextMatch.kickoff_at - Date.now() < lockMs;
  const lockedUntil = isLocked ? new Date(nextMatch!.kickoff_at).toLocaleString() : null;

  const playersByPos = (data.players ?? []).reduce<Record<string, Player[]>>((acc, p) => {
    (acc[p.position] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-12">
      <header className="grid grid-cols-12 gap-6 items-end">
        <div className="col-span-7">
          <p className="eyebrow">{data.team.formation}</p>
          <h1 className="font-display text-display-lg text-paper mt-3 leading-none">
            {data.team.name}
          </h1>
        </div>
        <div className="col-span-5 grid grid-cols-2 gap-px bg-line border border-line rounded-lg overflow-hidden">
          <div className="bg-panel px-5 py-4">
            <p className="eyebrow">ELO</p>
            <p className="font-data text-3xl text-paper mt-1 tabular-nums">{data.team.rating}</p>
          </div>
          <div className="bg-panel px-5 py-4">
            <p className="eyebrow">Squad</p>
            <p className="font-data text-3xl text-paper mt-1 tabular-nums">{(data.players ?? []).length}</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="eyebrow">Formation</h2>
            <span className="font-data text-[11px] text-dim">Attacking →</span>
          </div>
          <div className="border border-line bg-panel rounded-lg p-4">
            <Pitch
              home={{
                formation: data.team.formation as Formation,
                players: data.players,
                primary: "#4FFF8B",
                secondary: "#0C100D",
                label: data.team.name,
              }}
              size="lg"
            />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-3">
          <h2 className="eyebrow">Squad</h2>
          <div className="border border-line bg-panel rounded-lg divide-y divide-line">
            {(["GK", "DF", "MF", "FW"] as const).map((pos) => (
              <div key={pos} className="px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <p className="eyebrow">{pos}</p>
                  <p className="font-data text-[10px] text-dim">
                    {(playersByPos[pos] ?? []).length}
                  </p>
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {(playersByPos[pos] ?? []).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-paper">{p.name}</span>
                      <span className="font-data text-xs text-dim tabular-nums">
                        {p.overall}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {data.strategy && (
        <StrategyEditor
          initial={data.strategy}
          locked={!!isLocked}
          lockedUntil={lockedUntil}
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
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="eyebrow">Strategy</h2>
        {isDirty && !locked && <span className="font-data text-[10px] text-amber">UNSAVED</span>}
      </div>
      {locked && (
        <div className="border border-amber/30 bg-amber/5 rounded-md px-4 py-3 text-amber text-sm">
          Strategy locked — next match starts {lockedUntil}.
        </div>
      )}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="border border-line bg-panel rounded-lg p-6 space-y-5"
      >
        <div className="grid sm:grid-cols-3 gap-4">
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

        <div className="grid sm:grid-cols-3 gap-4">
          <RangeField label="Pressing" name="pressing" value={w.pressing} register={register} disabled={locked} />
          <RangeField label="Passing risk" name="passing_risk" value={w.passing_risk} register={register} disabled={locked} />
          <RangeField label="Width" name="width" value={w.width} register={register} disabled={locked} />
        </div>

        <label className="flex items-center gap-2.5 text-sm text-muted">
          <input
            type="checkbox"
            {...register("fouls_tactical")}
            disabled={locked}
            className="accent-pitch"
          />
          <span>Tactical fouls (more disruption, more cards)</span>
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={locked || !isDirty || submitting}
            className="h-10 px-5 rounded-md bg-pitch text-ink font-body text-sm font-medium hover:bg-pitch-glow disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Saving…" : "Save strategy"}
          </button>
        </div>
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
        className="w-full accent-pitch"
      />
    </Field>
  );
}
