import type { Options } from "../index.js";
import { get_is_target_deno } from "./utils.js";

const ts_config = {
  compilerOptions: {
    target: "ES2022",
    module: "NodeNext",
    moduleResolution: "NodeNext",
    forceConsistentCasingInFileNames: true,
    strict: true,
    skipLibCheck: true,
    esModuleInterop: true,
    jsx: "react-jsx",
    jsxImportSource: "preact",
  },
  exclude: ["node_modules", "dist"],
};

const deno_config = {
  compilerOptions: {
    jsx: "react-jsx",
    jsxImportSource: "npm:hono/jsx",
  },
};

function get_ts_config(options: Options) {
  if (get_is_target_deno(options)) {
    return JSON.stringify(deno_config).trim() + "\n";
  }

  if (
    options.deployment_target === "node" ||
    options.deployment_target === "vercel-lambda"
  ) {
    // @ts-ignore
    ts_config.compilerOptions.types = ["node"];
  }

  if (options.deployment_target === "bun") {
    // @ts-ignore
    ts_config.compilerOptions.types = ["bun-types"];
  }

  if (options.deployment_target === "cloudflare-pages") {
    // @ts-ignore
    ts_config.compilerOptions.types = ["@cloudflare/workers-types", "node"];
  }

  return JSON.stringify(ts_config).trim() + "\n";
}

export { get_ts_config };
