import { DEFAULT_PORT } from "../../common/index.mjs";
import fs from "node:fs";

const pkg_json = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
);

const LATEST_HWY_VERSION = "^" + pkg_json.version;

const third_party_packages = [
  "@hono/node-server",
  "hono",
  "htmx.org",
  "typescript",
  "tailwindcss",
  "nprogress",
  "@types/nprogress",
  "@types/node",
  "bun-types",
  "@cloudflare/workers-types",
  "npm-run-all",
  "wrangler",
  "idiomorph",
  "@css-hooks/core",
] as const;

const versions_map = third_party_packages.map((pkg) => {
  return [pkg, pkg_json.devDependencies[pkg]];
});

const VERSIONS = Object.fromEntries(versions_map) as Record<
  (typeof third_party_packages)[number],
  string
>;

/******************************************************************************/

const SCRIPTS_WATERFALL_MAP = [
  [
    "BASE",
    {
      build: "hwy-build",
      dev: "hwy-dev-serve",
      start: "node dist/main.js",
    },
  ],

  [
    "IS_TYPESCRIPT",
    {
      build: "tsc --noEmit && hwy-build",
    },
  ],

  [
    "IS_VERCEL_JAVASCRIPT",
    {
      build: undefined,
      "vercel-build": "hwy-build",
    },
  ],

  [
    "IS_VERCEL_TYPESCRIPT",
    {
      build: undefined,
      "vercel-build": "tsc --noEmit && hwy-build",
    },
  ],

  [
    "IS_DENO",
    {
      start: "deno run -A dist/main.js",
    },
  ],

  [
    "IS_BUN",
    {
      dev: "bun run --bun hwy-dev-serve",
      start: "bun dist/main.js",
    },
  ],

  [
    "IS_TAILWIND",
    {
      "dev:tailwind":
        "tailwindcss -i src/styles/tw-input.css -o src/styles/tw-output.bundle.css -w",
      "dev:serve": "hwy-dev-serve",
      dev: "npm-run-all --parallel dev:*",
    },
  ],

  [
    "IS_DENO_TAILWIND",
    {
      dev: "deno task dev:tailwind & deno task dev:serve",
    },
  ],

  [
    "IS_BUN_TAILWIND",
    {
      dev: "bun run --bun npm-run-all --parallel dev:*",
    },
  ],

  [
    "IS_CF_PAGES",
    {
      // because we need npm-run-all for cf pages anyway, these
      // are compatible whether or not tailwind is enabled
      "dev:serve": "hwy-dev-serve",
      "dev:wrangler": `wrangler pages dev ./dist --compatibility-flag="nodejs_compat" --port=${DEFAULT_PORT} --live-reload`,
      dev: "npm run build && npm-run-all --parallel dev:*",
    },
  ],
] as const;

/******************************************************************************/

const DEPS_WATERFALL_MAP = [
  ["BASE", { hono: VERSIONS["hono"], hwy: LATEST_HWY_VERSION }],
  ["IS_CSS_HOOKS", { "@css-hooks/core": VERSIONS["@css-hooks/core"] }],
  ["IS_NODE", { "@hono/node-server": VERSIONS["@hono/node-server"] }],
] as const;

/******************************************************************************/

const DEV_DEPS_WATERFALL_MAP = [
  [
    "BASE",
    {
      "@hwy-js/build": LATEST_HWY_VERSION,
      "@hwy-js/client": LATEST_HWY_VERSION,
      "@hwy-js/dev": LATEST_HWY_VERSION,
      "@hwy-js/utils": LATEST_HWY_VERSION,
      "htmx.org": VERSIONS["htmx.org"],
      idiomorph: VERSIONS["idiomorph"],
    },
  ],

  ["IS_TYPESCRIPT", { typescript: VERSIONS.typescript }],

  [
    "IS_CLOUDFLARE_TYPESCRIPT",
    { "@cloudflare/workers-types": VERSIONS["@cloudflare/workers-types"] },
  ],

  ["IS_BUN_TYPESCRIPT", { "bun-types": VERSIONS["bun-types"] }],

  ["IS_NODE_TYPESCRIPT", { "@types/node": VERSIONS["@types/node"] }],

  [
    "IS_NPROGRESS_TYPESCRIPT",
    { "@types/nprogress": VERSIONS["@types/nprogress"] },
  ],

  ["IS_CF_PAGES", { wrangler: VERSIONS.wrangler }],

  ["IS_TAILWIND", { tailwindcss: VERSIONS.tailwindcss }],

  ["IS_NPROGRESS", { nprogress: VERSIONS.nprogress }],

  // cf pages OR non-deno tailwind
  ["IS_NPM_RUN_ALL", { "npm-run-all": VERSIONS["npm-run-all"] }],
] as const;

export {
  LATEST_HWY_VERSION,
  SCRIPTS_WATERFALL_MAP,
  DEPS_WATERFALL_MAP,
  DEV_DEPS_WATERFALL_MAP,
};
