import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "./api";
import { userSchema, type User } from "@ai-fifa/shared/schemas";

export type AuthUser = Pick<User, "id" | "email" | "display_name"> & { is_admin: boolean };

export const authKey = (path: string) => ["auth", path] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: authKey("me"),
    queryFn: async () => {
      try {
        const raw = await apiFetch<unknown>("/api/v1/me");
        return userSchema.parse(raw) as AuthUser & { created_at: number };
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return async () => {
    await apiFetch("/api/v1/auth/logout", { method: "POST" });
    qc.clear();
  };
}
