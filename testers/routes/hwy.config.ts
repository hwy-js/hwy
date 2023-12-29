import type { HwyConfig } from "@hwy-js/build";

export default {
  useClientSidePreact: true,
  useDotServerFiles: true,
  dev: {
    port: 2389,
  },
  deploymentTarget: "node",
} satisfies HwyConfig;
