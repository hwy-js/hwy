import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_PORT, hwyLog, type HwyConfig } from "../../common/index.mjs";

let cached_hwy_config: HwyConfig | undefined;

const js_path = path.join(process.cwd(), "hwy.config.js");
const ts_path = path.join(process.cwd(), "hwy.config.ts");
const ts_config_exists = fs.existsSync(ts_path);
const dist_dir_path = path.join(process.cwd(), "dist");
const dist_dir_exists = fs.existsSync(dist_dir_path);

async function get_hwy_config() {
  if (cached_hwy_config) {
    return cached_hwy_config;
  }

  if (!dist_dir_exists) {
    await fs.promises.mkdir(dist_dir_path, { recursive: true });
  }

  await esbuild.build({
    entryPoints: [ts_config_exists ? ts_path : js_path],
    bundle: true,
    outdir: path.resolve("dist"),
    treeShaking: true,
    platform: "node",
    format: "esm",
    packages: "external",
  });

  const path_to_config_in_dist = path.join(dist_dir_path, "hwy.config.js");
  const full_url_to_import = pathToFileURL(path_to_config_in_dist).href;
  const imported = await import(full_url_to_import);
  const internal_hwy_config = imported.default as HwyConfig | undefined;

  if (internal_hwy_config && typeof internal_hwy_config !== "object") {
    throw new Error("hwy.config must export an object");
  }

  const IS_PREACT_MPA = internal_hwy_config?.useClientSidePreact === true;

  if (IS_PREACT_MPA && internal_hwy_config?.useDotServerFiles !== true) {
    hwyLog(
      "WARN",
      "When using Preact, 'hwyConfig.useDotServerFiles' is effectively always set to true.",
      "This helps keep your server code out of your client bundle.",
      "To quiet this warning, explicitly set 'useDotServerFiles' to true in your Hwy config.",
    );
  }

  if (
    internal_hwy_config?.routeStrategy !== "bundle" &&
    internal_hwy_config?.deploymentTarget === "cloudflare-pages"
  ) {
    hwyLog(
      "WARN",
      "Setting 'routeStrategy' has no effect when 'deploymentTarget' is 'cloudflare-pages'.",
      "It will always effectively be 'bundle'.",
    );
  }

  cached_hwy_config = {
    dev: {
      port: Number(internal_hwy_config?.dev?.port || DEFAULT_PORT),
      watchExclusions: internal_hwy_config?.dev?.watchExclusions || [],
      watchInclusions: internal_hwy_config?.dev?.watchInclusions || [],
      hotReloadStyles:
        internal_hwy_config?.dev?.hotReloadStyles === false ? false : true,
    },
    deploymentTarget: internal_hwy_config?.deploymentTarget || "node",
    routeStrategy: internal_hwy_config?.routeStrategy || "always-lazy",
    useClientSidePreact: IS_PREACT_MPA,
    useDotServerFiles: IS_PREACT_MPA
      ? true
      : internal_hwy_config?.useDotServerFiles || false,
    usePreactCompat: internal_hwy_config?.usePreactCompat || false,
    scriptsToInject: internal_hwy_config?.scriptsToInject || [],
  } as any;

  // delete the file now that we're done with it
  await fs.promises.unlink(path_to_config_in_dist);

  return cached_hwy_config as HwyConfig;
}

export { get_hwy_config };
export type { HwyConfig };
