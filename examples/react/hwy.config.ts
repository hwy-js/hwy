import type { HwyConfig } from "@hwy-js/build";

export default {
  useClientSideReact: true,
  useDotServerFiles: true,
  dev: {
    watchExclusions: ["src/styles/normal/tw-output.css"],
  },
  routeStrategy: "warm-cache-at-startup",
} satisfies HwyConfig;
