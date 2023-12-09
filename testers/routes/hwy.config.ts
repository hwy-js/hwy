import type { HwyConfig } from "@hwy-js/build";

export default {
  mode: "preact-mpa",
  dev: {
    port: 2389,
  },
  deploymentTarget: "node",
  useDotServerFiles: true,
} satisfies HwyConfig;
