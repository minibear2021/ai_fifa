export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Envelope<T> = { data: T; meta?: Record<string, unknown> };
type ErrorEnvelope = { error: { code: string; message: string; details?: unknown } };

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const json = (await res.json().catch(() => null)) as Envelope<T> | ErrorEnvelope | null;

  if (!res.ok) {
    const err = (json as ErrorEnvelope | null)?.error;
    throw new ApiError(err?.code ?? "HTTP_ERROR", err?.message ?? res.statusText, res.status, err?.details);
  }

  if (json && "data" in json) {
    return (json as Envelope<T>).data;
  }
  return json as T;
}
