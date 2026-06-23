import type { ReactNode } from "react";

export const inputClass =
  "w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-700 focus:border-emerald-500 focus:outline-none text-slate-100";

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-300 block mb-1">{label}</span>
      {children}
      {hint && !error && <span className="text-xs text-slate-500 mt-1 block">{hint}</span>}
      {error && <span className="text-xs text-red-400 mt-1 block">{error}</span>}
    </label>
  );
}
