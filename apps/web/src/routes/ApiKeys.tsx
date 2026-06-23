import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { apiFetch, ApiError } from "../lib/api";
import { Field, inputClass } from "../components/Field";

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
    mutationFn: async (body: CreateForm) => {
      return apiFetch<ApiKeyRow>("/api/v1/me/api-keys", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["me", "api-keys"] });
      if (data.secret) setNewSecret({ label: data.label, secret: data.secret });
      toast.success("API key created", {
        description: "Copy the secret now — it will not be shown again.",
      });
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error(String(err));
    },
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/api/v1/me/api-keys/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "api-keys"] });
      toast.success("Key revoked");
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">API keys</h1>
        <p className="text-slate-400 text-sm mt-1">
          Use these to let your AI agent call the platform. See{" "}
          <Link to="/api/v1/docs/ui" className="text-emerald-400 hover:underline">
            API docs
          </Link>{" "}
          for the agent protocol.
        </p>
      </header>

      <form
        onSubmit={handleSubmit((v) => {
          create.mutate(v);
          reset();
        })}
        className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 grid sm:grid-cols-3 gap-3"
      >
        <Field label="Label" error={errors.label?.message}>
          <input {...register("label")} className={inputClass} placeholder="claude-001" />
        </Field>
        <div className="flex items-end sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md bg-emerald-500 text-slate-950 font-medium hover:bg-emerald-400 disabled:opacity-50"
          >
            {isSubmitting ? "Creating…" : "Create key"}
          </button>
        </div>
      </form>

      {newSecret && (
        <SecretDialog
          label={newSecret.label}
          secret={newSecret.secret}
          onClose={() => setNewSecret(null)}
        />
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Your keys</h2>
        {list.isLoading && <p className="text-slate-400">Loading…</p>}
        {list.data && list.data.length === 0 && (
          <p className="text-slate-500">No keys yet.</p>
        )}
        <div className="space-y-2">
          {(list.data ?? []).map((k) => (
            <div
              key={k.id}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{k.label}</p>
                <p className="text-xs text-slate-500 font-mono">{k.key_prefix}…</p>
                <p className="text-xs text-slate-500">
                  Created {new Date(k.created_at).toLocaleString()}
                  {k.last_used_at && ` · Last used ${new Date(k.last_used_at).toLocaleString()}`}
                </p>
              </div>
              <div className="text-right">
                {k.revoked_at ? (
                  <span className="text-xs text-red-400">revoked</span>
                ) : (
                  <button
                    onClick={() => {
                      if (confirm(`Revoke key "${k.label}"?`)) revoke.mutate(k.id);
                    }}
                    className="text-xs text-red-400 hover:underline"
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
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <div className="rounded-xl bg-slate-900 border border-emerald-700 p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold text-emerald-400">Save your new API key</h3>
        <p className="text-sm text-slate-400 mt-1">
          This is the only time the full secret will be shown. Store it somewhere safe.
        </p>
        <p className="text-xs text-slate-500 mt-3">Label: {label}</p>
        <pre className="mt-2 p-3 rounded bg-slate-950 border border-slate-800 text-emerald-300 text-sm overflow-x-auto">
          {secret}
        </pre>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(secret);
              setCopied(true);
            }}
            className="px-3 py-1.5 rounded-md bg-emerald-500 text-slate-950 text-sm font-medium hover:bg-emerald-400"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 text-sm hover:bg-slate-700"
          >
            I have saved it
          </button>
        </div>
      </div>
    </div>
  );
}
