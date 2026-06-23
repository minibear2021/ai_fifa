import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    setupFiles: ["./test-setup.ts"],
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: ["DB"],
          bindings: {
            ENVIRONMENT: "test",
            ALLOWED_ORIGIN: "http://localhost:5173",
            JWT_SECRET: "test-secret-must-be-long-enough-for-hs256-32bytes",
          },
        },
      },
    },
  },
});
