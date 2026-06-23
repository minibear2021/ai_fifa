import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tactical Operations Room palette.
        // Avoid emerald / cream / acid-green / vermilion — the AI defaults.
        ink: "#0C100D",
        panel: "#161C17",
        "panel-2": "#1F2620",
        "panel-3": "#283028",
        line: "#2A332D",
        "line-2": "#3A443C",
        paper: "#ECEFE6",
        muted: "#98A39A",
        dim: "#5C6660",
        pitch: "#4FFF8B",
        "pitch-dim": "#2EA862",
        "pitch-glow": "#7FFFA8",
        amber: "#FFB84D",
        card: "#FF5E6B",
        draw: "#A8B0A8",
      },
      fontFamily: {
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
        body: ['"Geist"', "ui-sans-serif", "system-ui", "sans-serif"],
        data: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "display-2xl": ["4.5rem", { lineHeight: "1.02", letterSpacing: "-0.04em", fontWeight: "600" }],
        "display-xl": ["3.5rem", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "600" }],
        "display-lg": ["2.5rem", { lineHeight: "1.08", letterSpacing: "-0.02em", fontWeight: "600" }],
      },
      letterSpacing: {
        eyebrow: "0.18em",
      },
      boxShadow: {
        inset: "inset 0 1px 0 0 rgba(236,239,230,0.04)",
        card: "0 1px 0 0 rgba(236,239,230,0.04), 0 12px 32px -16px rgba(0,0,0,0.5)",
        glow: "0 0 0 1px rgba(79,255,139,0.3), 0 0 24px -4px rgba(79,255,139,0.4)",
      },
    },
  },
  plugins: [],
} satisfies Config;
