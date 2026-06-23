import { describe, it, expect } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { createApp } from "../app.js";

describe("API smoke", () => {
  it("GET /healthz returns ok", async () => {
    const app = createApp();
    const res = await app.request(
      "/healthz",
      {},
      {
        ENVIRONMENT: "test",
        ALLOWED_ORIGIN: "http://localhost:5173",
        DB: {} as D1Database,
      },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("ok");
  });

  it("GET /api/v1/seasons/current returns a season", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/v1/seasons/current",
      {},
      {
        ENVIRONMENT: "test",
        ALLOWED_ORIGIN: "http://localhost:5173",
        DB: {} as D1Database,
      },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { name: string; id: string } };
    expect(body.data.name).toMatch(/Season/);
    expect(body.data.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("GET /unknown returns 404 NOT_FOUND", async () => {
    const app = createApp();
    const res = await app.request(
      "/does-not-exist",
      {},
      {
        ENVIRONMENT: "test",
        ALLOWED_ORIGIN: "http://localhost:5173",
        DB: {} as D1Database,
      },
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
