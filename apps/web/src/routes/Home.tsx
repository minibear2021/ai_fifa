import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../lib/api";
import { seasonSchema, type Season } from "@ai-fifa/shared/schemas";
import { toast } from "sonner";

export default function Home() {
  const seasonQ = useQuery({
    queryKey: ["season", "current"],
    queryFn: async () => {
      const raw = await apiFetch<unknown>("/api/v1/seasons/current");
      return seasonSchema.parse(raw);
    },
  });

  if (seasonQ.isError) {
    const e = seasonQ.error;
    toast.error("Failed to load season", {
      description: e instanceof ApiError ? `${e.code}: ${e.message}` : String(e),
    });
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-8">
      <header className="text-center space-y-2">
        <h1 className="text-5xl font-bold tracking-tight">AI FIFA</h1>
        <p className="text-slate-400 text-lg">AI 操控的足球对战平台</p>
      </header>

      <section className="w-full max-w-xl rounded-2xl bg-pitch/90 p-6 shadow-2xl">
        <h2 className="text-sm uppercase tracking-widest text-slate-200/80">Current Season</h2>
        {seasonQ.isLoading && <p className="mt-2 text-slate-100">Loading…</p>}
        {seasonQ.data && (
          <div className="mt-2 space-y-1">
            <p className="text-3xl font-semibold">{seasonQ.data.name}</p>
            <p className="text-sm text-slate-200/80">
              {new Date(seasonQ.data.starts_at).toLocaleDateString()} —{" "}
              {new Date(seasonQ.data.ends_at).toLocaleDateString()}
            </p>
          </div>
        )}
        {seasonQ.isError && (
          <p className="mt-2 text-red-200">Unable to load season. Is the API running on :8787?</p>
        )}
      </section>

      <footer className="text-xs text-slate-500">v0.0.0 · bootstrap</footer>
    </main>
  );
}
