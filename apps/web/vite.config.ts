import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedSrc = path.resolve(__dirname, "../../packages/shared/src");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@ai-fifa\/shared\/schemas$/, replacement: path.resolve(sharedSrc, "schemas/index.ts") },
      { find: /^@ai-fifa\/shared\/simulator$/, replacement: path.resolve(sharedSrc, "simulator/index.ts") },
      { find: /^@ai-fifa\/shared$/, replacement: path.resolve(sharedSrc, "index.ts") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
