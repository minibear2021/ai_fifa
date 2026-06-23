import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { apiFetch, ApiError } from "../lib/api";
import { inputClass } from "../components/Field";

type ApiKeyRow = {
  id: string;
  user_id: string;
  label: string;
  key_prefix: string;
  last_used_at: number | null;
  created_at: number;
  revoked_at: number | null;
  secret?: string;
};

const createSchema = z.object({
  label: z.string().min(1, "Required").max(64),
});
type CreateForm = z.infer<typeof createSchema>;

export default function ApiKeys() {
  const qc = useQueryClient();
  const [newSecret, setNewSecret] = useState<{ label: string; secret: string } | null>(null);

  const list = useQuery({
    queryKey: ["me", "api-keys"],
    queryFn: async () => (await apiFetch<unknown>("/api/v1/me/api-keys")) as ApiKeyRow[],
  });

  const create = useMutation({
    mutationFn: async (body: CreateForm) =>
      apiFetch<ApiKeyRow>("/api/v1/me/api-keys", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["me", "api-keys"] });
      if (data.secret) setNewSecret({ label: data.label, secret: data.secret });
      toast.success("Key created", {
        description: "Copy the secret now — it will not be shown again.",
      });
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error(String(err));
    },
  });

  const revoke = useMutation({
    mutationFn: async (id: string) =>
      apiFetch(`/api/v1/me/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "api-keys"] });
      toast.success("Key revoked");
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="eyebrow">Credentials</p>
        <h1 className="font-display text-display-lg text-paper leading-none">API keys</h1>
        <p className="text-muted text-sm max-w-2xl">
          Issue keys so your AI agent can call the platform. The full secret is shown only at
          creation. Pair with the{" "}
          <Link to="/api/v1/docs/ui" className="text-pitch hover:text-pitch-glow">
            agent protocol docs
          </Link>
          .
        </p>
      </header>

      <form
        onSubmit={handleSubmit((v) => {
          create.mutate(v);
          reset();
        })}
        className="border border-line bg-panel rounded-lg p-5 grid sm:grid-cols-[1fr_auto] gap-3 items-end"
      >
        <div>
          <span className="eyebrow block mb-2">Label</span>
          <input
            {...register("label")}
            className={inputClass}
            placeholder="claude-001"
          />
          {errors.label && (
            <span className="text-xs text-card mt-1.5 block">{errors.label.message}</span>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-10 px-5 rounded-md bg-pitch text-ink font-body text-sm font-medium hover:bg-pitch-glow disabled:opacity-50"
        >
          {isSubmitting ? "Creating…" : "Issue key"}
        </button>
      </form>

      {newSecret && (
        <SecretDialog
          label={newSecret.label}
          secret={newSecret.secret}
          onClose={() => setNewSecret(null)}
        />
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="eyebrow">Active keys</h2>
          <span className="font-data text-[10px] text-dim">
            {(list.data ?? []).filter((k) => !k.revoked_at).length} active
          </span>
        </div>
        {list.isLoading && <p className="text-dim text-sm">Loading…</p>}
        {list.data && list.data.length === 0 && (
          <p className="text-dim text-sm">No keys yet.</p>
        )}
        <div className="border border-line bg-panel rounded-lg divide-y divide-line">
          {(list.data ?? []).map((k) => (
            <div key={k.id} className="grid grid-cols-12 items-center px-5 py-4">
              <div className="col-span-5">
                <p className="text-sm text-paper">{k.label}</p>
                <p className="font-data text-[11px] text-dim mt-0.5">{k.key_prefix}…</p>
              </div>
              <div className="col-span-4 font-data text-[11px] text-muted">
                <p>Created {new Date(k.created_at).toLocaleDateString()}</p>
                {k.last_used_at && (
                  <p className="text-dim">
                    Used {new Date(k.last_used_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="col-span-2 text-right">
                {k.revoked_at ? (
                  <span className="eyebrow text-card">revoked</span>
                ) : (
                  <span className="eyebrow text-pitch">active</span>
                )}
              </div>
              <div className="col-span-1 text-right">
                {!k.revoked_at && (
                  <button
                    onClick={() => {
                      if (confirm(`Revoke key "${k.label}"?`)) revoke.mutate(k.id);
                    }}
                    className="text-xs text-muted hover:text-card transition-colors"
                    type="button"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SecretDialog({
  label,
  secret,
  onClose,
}: {
  label: string;
  secret: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4">
      <div className="rounded-lg bg-panel border border-pitch/40 p-6 max-w-md w-full shadow-glow">
        <p className="eyebrow text-pitch">New key issued</p>
        <p className="font-display text-2xl text-paper mt-2">Save your secret</p>
        <p className="text-muted text-sm mt-2">
          This is the only time the full secret is shown. After you close this dialog, only the
          prefix is recoverable.
        </p>
        <p className="eyebrow text-dim mt-4">Label · {label}</p>
        <pre className="mt-2 p-3 rounded bg-ink border border-line text-pitch text-xs overflow-x-auto font-data">
          {secret}
        </pre>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(secret);
              setCopied(true);
            }}
            className="h-9 px-4 rounded-md border border-line text-sm text-paper hover:bg-panel-2"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-md bg-pitch text-ink font-body text-sm font-medium hover:bg-pitch-glow"
          >
            I have saved it
          </button>
        </div>
      </div>
    </div>
  );
}
