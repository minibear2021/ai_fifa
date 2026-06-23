import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiError } from "../lib/api";
import { inputClass } from "../components/Field";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const qc = useQueryClient();
  const [loggedIn, setLoggedIn] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await apiFetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      toast.success("Logged in");
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      setLoggedIn(true);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error("Login failed", { description: err.message });
      } else {
        toast.error("Login failed", { description: String(err) });
      }
    }
  });

  useEffect(() => {
    if (loggedIn) {
      const target = location.state?.from;
      navigate(target && target !== "/login" ? target : "/dashboard", { replace: true });
    }
  }, [loggedIn, navigate, location.state]);

  return (
    <div className="max-w-md mx-auto pt-12">
      <p className="eyebrow">Sign in</p>
      <h1 className="font-display text-display-lg text-paper mt-3 leading-none">
        Welcome back,<br />
        <span className="italic text-muted">coach.</span>
      </h1>

      <form onSubmit={onSubmit} className="mt-10 space-y-5">
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
            autoComplete="current-password"
            className={inputClass}
          />
          {errors.password && (
            <span className="text-xs text-card mt-1.5 block">{errors.password.message}</span>
          )}
        </label>
        <div className="flex items-center justify-between pt-2">
          <Link to="/register" className="text-sm text-muted hover:text-paper">
            New here? <span className="text-pitch">Create account →</span>
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-5 rounded-md bg-pitch text-ink font-body text-sm font-medium hover:bg-pitch-glow disabled:opacity-50"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
