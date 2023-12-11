import type { HwyConfig } from "@hwy-js/build";

export default {
  mode: "preact-spa",
  deploymentTarget: "bun",
  dev: {
    port: 3002,
  },
} satisfies HwyConfig;