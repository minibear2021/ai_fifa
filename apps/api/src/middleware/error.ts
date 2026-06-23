import type { Context, Next } from "hono";

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errors = {
  invalidInput: (message: string, details?: unknown) =>
    new AppError("INVALID_INPUT", message, 400, details),
  validationFailed: (details: unknown) =>
    new AppError("VALIDATION_FAILED", "Request validation failed", 400, details),
  unauthenticated: () => new AppError("UNAUTHENTICATED", "Authentication required", 401),
  forbidden: (message = "Forbidden") => new AppError("FORBIDDEN", message, 403),
  notFound: (resource: string) => new AppError("NOT_FOUND", `${resource} not found`, 404),
  conflict: (code: string, message: string) => new AppError("CONFLICT", message, 409, { code }),
  rateLimited: (retryAfterSec: number) =>
    new AppError("RATE_LIMITED", "Too many requests", 429, { retry_after: retryAfterSec }),
  internal: (message = "Internal server error") =>
    new AppError("INTERNAL", message, 500),
};

export function isAppError(err: unknown): err is AppError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "status" in err &&
    typeof (err as { code: unknown }).code === "string" &&
    typeof (err as { status: unknown }).status === "number"
  );
}
