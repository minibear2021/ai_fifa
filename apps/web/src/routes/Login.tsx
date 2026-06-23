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
      // Invalidate /me so Layout and any ProtectedRoute refetch the user.
      // (cookie is set by server; query cache still has the old null.)
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
    <div className="max-w-sm mx-auto py-12">
      <h1 className="text-2xl font-bold mb-1">Log in</h1>
      <p className="text-slate-400 text-sm mb-6">Welcome back, coach.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm text-slate-300 block mb-1">Email</span>
          <input {...register("email")} type="email" autoComplete="email" className={inputClass} />
          {errors.email && <span className="text-xs text-red-400 mt-1 block">{errors.email.message}</span>}
        </label>
        <label className="block">
          <span className="text-sm text-slate-300 block mb-1">Password</span>
          <input
            {...register("password")}
            type="password"
            autoComplete="current-password"
            className={inputClass}
          />
          {errors.password && <span className="text-xs text-red-400 mt-1 block">{errors.password.message}</span>}
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 rounded-md bg-emerald-500 text-slate-950 font-medium hover:bg-emerald-400 disabled:opacity-50"
        >
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="text-sm text-slate-400 mt-6 text-center">
        No account yet?{" "}
        <Link to="/register" className="text-emerald-400 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
