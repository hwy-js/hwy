import type { Config } from "tailwindcss";

export default {
  darkMode: "media",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
  future: {
    hoverOnlyWhenSupported: true,
  },
} satisfies Config;
