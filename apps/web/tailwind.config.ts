import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: "#0a7e3a",
        chalk: "#f5f5f5",
      },
    },
  },
  plugins: [],
} satisfies Config;
