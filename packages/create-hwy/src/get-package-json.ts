import type { Options } from "../index.js";
import {
  SCRIPTS_WATERFALL_MAP,
  DEPS_WATERFALL_MAP,
  DEV_DEPS_WATERFALL_MAP,
} from "./waterfall-maps.js";
import { get_is_target_deno } from "./utils.js";

// QUESTIONS
// Question 2 -- Vanilla, Tailwind, or CSS Hooks
// Question 3 -- Node, Vercel, Cloudflare Pages, Bun, Deno, or Deno Deploy
// Question 4 -- NProgress?

function get_package_json(options: Options) {
  const IS_DENO = get_is_target_deno(options);
  const IS_BUN = options.deployment_target === "bun";
  const IS_TAILWIND = options.css_preference === "tailwind";
  const IS_CF_PAGES = options.deployment_target === "cloudflare-pages";
  const IS_NODE = !IS_DENO && !IS_BUN;

  const STATE = {
    // SCRIPTS
    BASE: true,
    IS_VERCEL: options.deployment_target === "vercel-lambda",
    IS_DENO,
    IS_BUN,
    IS_TAILWIND,
    IS_DENO_TAILWIND: IS_DENO && IS_TAILWIND,
    IS_BUN_TAILWIND: IS_BUN && IS_TAILWIND,
    IS_CF_PAGES,

    // DEPS, if not above
    IS_CSS_HOOKS: options.css_preference === "css-hooks",
    IS_NODE,

    // DEV DEPS, if not above
    IS_NPROGRESS: options.with_nprogress,
    IS_NPM_RUN_ALL: IS_CF_PAGES || (!IS_DENO && IS_TAILWIND),
  } as const;

  let scripts = {} as Record<string, any>;

  for (const [key, value] of SCRIPTS_WATERFALL_MAP) {
    if (STATE[key]) {
      scripts = { ...scripts, ...value };
    }
  }

  let dependencies = {} as Record<string, any>;

  for (const [key, value] of DEPS_WATERFALL_MAP) {
    if (STATE[key]) {
      dependencies = { ...dependencies, ...value };
    }
  }

  let devDependencies = {} as Record<string, any>;

  for (const [key, value] of DEV_DEPS_WATERFALL_MAP) {
    if (STATE[key]) {
      devDependencies = { ...devDependencies, ...value };
    }
  }

  // sort scripts
  const scripts_keys = Object.keys(scripts);
  // sort once alphabetically, adjusting for "vercel-build"
  scripts_keys.sort(function (a, b) {
    // treat "vercel-build" like it were "build"
    if (a === "vercel-build") a = "build";
    if (b === "vercel-build") b = "build";
    return a.localeCompare(b);
  });
  // sort again, sub-script first (e.g. "build:css" before "build")
  scripts_keys.sort(function (a, b) {
    const a_has_colon = a.includes(":");
    const b_has_colon = b.includes(":");
    if (a_has_colon && !b_has_colon && a.startsWith(b)) {
      return -1;
    } else if (!a_has_colon && b_has_colon && b.startsWith(a)) {
      return 1;
    } else {
      return 0;
    }
  });
  scripts = Object.fromEntries(scripts_keys.map((key) => [key, scripts[key]]));

  // sort dependencies
  const dependencies_keys = Object.keys(dependencies);
  dependencies_keys.sort();
  dependencies = Object.fromEntries(
    dependencies_keys.map((key) => [key, dependencies[key]]),
  );

  // sort devDependencies
  const devDependencies_keys = Object.keys(devDependencies);
  devDependencies_keys.sort();
  devDependencies = Object.fromEntries(
    devDependencies_keys.map((key) => [key, devDependencies[key]]),
  );

  return (
    JSON.stringify(
      {
        name: options.project_name,
        private: true,
        type: "module",
        scripts,
        dependencies,
        devDependencies,
        ...(IS_NODE && !IS_CF_PAGES
          ? {
              engines: {
                node: ">=18.14.1",
              },
            }
          : {}),
      },
      null,
      2,
    ) + "\n"
  );
}

export { get_package_json };
