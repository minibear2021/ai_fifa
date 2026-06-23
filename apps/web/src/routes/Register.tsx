import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiFetch, ApiError } from "../lib/api";
import { Field, inputClass } from "../components/Field";

const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "At least 8 characters"),
  display_name: z.string().min(1, "Required").max(64, "Max 64 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
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
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error("Registration failed", { description: `${err.code}: ${err.message}` });
      } else {
        toast.error("Registration failed", { description: String(err) });
      }
    }
  });

  return (
    <div className="max-w-sm mx-auto py-12">
      <h1 className="text-2xl font-bold mb-1">Create account</h1>
      <p className="text-slate-400 text-sm mb-6">Set up your team in 30 seconds.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Display name" error={errors.display_name?.message}>
          <input
            {...register("display_name")}
            type="text"
            autoComplete="name"
            className={inputClass}
          />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input {...register("email")} type="email" autoComplete="email" className={inputClass} />
        </Field>
        <Field label="Password" error={errors.password?.message} hint="≥ 8 characters">
          <input
            {...register("password")}
            type="password"
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 rounded-md bg-emerald-500 text-slate-950 font-medium hover:bg-emerald-400 disabled:opacity-50"
        >
          {isSubmitting ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="text-sm text-slate-400 mt-6 text-center">
        Already have an account?{" "}
        <Link to="/login" className="text-emerald-400 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
