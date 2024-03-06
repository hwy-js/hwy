import type { HwyConfig } from "@hwy-js/build";

export default {
  useClientSidePreact: true,
  useDotServerFiles: true,
  dev: {
    port: 1275,
  },
  deploymentTarget: "node",
  routeStrategy: "always-lazy",
} satisfies HwyConfig;
