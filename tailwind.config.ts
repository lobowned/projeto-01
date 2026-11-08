import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { marca: { DEFAULT: "#16a34a", escuro: "#14532d" } } } },
  plugins: [],
} satisfies Config;
