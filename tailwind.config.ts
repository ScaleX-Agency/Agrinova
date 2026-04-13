// tailwind.config.ts — add this inside theme.extend
// (merge with your existing config, don't replace the whole file)

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // ── Add this block ──────────────────────────────────────
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
      },
      // ────────────────────────────────────────────────────────
    },
  },
  plugins: [],
};

export default config;
