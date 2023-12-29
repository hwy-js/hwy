function get_tailwind_config() {
  return (
    `
import type { Config } from "tailwindcss";\n\n` +
    `export default {
  darkMode: "media",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
  future: {
    hoverOnlyWhenSupported: true,
  },
} satisfies Config;\n`.trimStart()
  );
}

export { get_tailwind_config };
