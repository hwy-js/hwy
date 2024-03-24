import type { HwyConfig } from "@hwy-js/build";

export default {
  scriptsToInject: [
    "node_modules/htmx.org/dist/htmx.min.js",
    "node_modules/htmx.org/dist/ext/head-support.js",
    "node_modules/idiomorph/dist/idiomorph-ext.min.js",
    "node_modules/nprogress/nprogress.js",
  ],
} satisfies HwyConfig;
