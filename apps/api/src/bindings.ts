import type { D1Database } from "@cloudflare/workers-types";

export type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
  ALLOWED_ORIGIN?: string;
  JWT_SECRET: string;
};

export type AppContext = {
  Bindings: Bindings;
  Variables: {
    userId?: string;
    apiKeyUserId?: string;
    apiKeyId?: string;
  };
};
