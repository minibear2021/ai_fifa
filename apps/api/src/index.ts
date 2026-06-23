import { createApp } from "./app.js";

export type { SeasonRow, UserRow } from "./db/schema.js";
export { createDb } from "./db/client.js";
export type { Db } from "./db/client.js";

const app = createApp();

export default {
  fetch: app.fetch,
};
