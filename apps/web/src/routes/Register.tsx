import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiError } from "../lib/api";
import { inputClass } from "../components/Field";

const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "At least 8 characters"),
  display_name: z.string().min(1, "Required").max(64, "Max 64 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [registered, setRegistered] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await apiFetch("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(values),
      });
      toast.success("Account created", { description: "Welcome to AI FIFA" });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      setRegistered(true);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error("Registration failed", { description: `${err.code}: ${err.message}` });
      } else {
        toast.error("Registration failed", { description: String(err) });
      }
    }
  });

  useEffect(() => {
    if (registered) {
      navigate("/dashboard", { replace: true });
    }
  }, [registered, navigate]);

  return (
    <div className="max-w-md mx-auto pt-12">
      <p className="eyebrow">New coach</p>
      <h1 className="font-display text-display-lg text-paper mt-3 leading-none">
        Sign your<br />
        <span className="italic text-pitch">first contract.</span>
      </h1>
      <p className="text-muted text-sm mt-3">Pick a name. We do the rest.</p>

      <form onSubmit={onSubmit} className="mt-10 space-y-5">
        <label className="block">
          <span className="eyebrow block mb-2">Display name</span>
          <input
            {...register("display_name")}
            type="text"
            autoComplete="name"
            className={inputClass}
            placeholder="Pep Guardiola"
          />
          {errors.display_name && (
            <span className="text-xs text-card mt-1.5 block">{errors.display_name.message}</span>
          )}
        </label>
        <label className="block">
          <span className="eyebrow block mb-2">Email</span>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            className={inputClass}
            placeholder="you@team.ai"
          />
          {errors.email && (
            <span className="text-xs text-card mt-1.5 block">{errors.email.message}</span>
          )}
        </label>
        <label className="block">
          <span className="eyebrow block mb-2">Password</span>
          <input
            {...register("password")}
            type="password"
            autoComplete="new-password"
            className={inputClass}
          />
          {errors.password && (
            <span className="text-xs text-card mt-1.5 block">{errors.password.message}</span>
          )}
          <span className="eyebrow text-dim mt-1.5 block">≥ 8 characters</span>
        </label>
        <div className="flex items-center justify-between pt-2">
          <Link to="/login" className="text-sm text-muted hover:text-paper">
            Already have an account? <span className="text-pitch">Sign in →</span>
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-5 rounded-md bg-pitch text-ink font-body text-sm font-medium hover:bg-pitch-glow disabled:opacity-50"
          >
            {isSubmitting ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>
    </div>
  );
}
