import type { HwyConfig } from "@hwy-js/build";

export default {
  dev: {
    port: 1275,
  },
  deploymentTarget: "vercel-lambda",
  routeStrategy: "bundle",
} satisfies HwyConfig;
