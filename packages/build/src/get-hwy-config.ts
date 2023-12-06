import fs from "node:fs";
import path from "node:path";
import { DEFAULT_PORT, type HwyConfig } from "../../common/index.mjs";
import esbuild from "esbuild";
import { pathToFileURL } from "node:url";

const js_path = path.join(process.cwd(), "hwy.config.js");
const ts_path = path.join(process.cwd(), "hwy.config.ts");
const ts_config_exists = fs.existsSync(ts_path);
const dist_dir_path = path.join(process.cwd(), "dist");
const dist_dir_exists = fs.existsSync(dist_dir_path);

async function get_hwy_config(): Promise<HwyConfig> {
  // if ((globalThis as any).cached_hwy_config) {
  //   console.log("IT IS CACHED");
  //   return (globalThis as any).cached_hwy_config;
  // } else {
  //   console.log("IT IS NOT CACHED");
  // }

  // if (!dist_dir_exists) {
  //   fs.mkdirSync(dist_dir_path, { recursive: true });
  // }

  await esbuild.build({
    entryPoints: [ts_config_exists ? ts_path : js_path],
    bundle: true,
    outdir: "dist",
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

  // (globalThis as any).cached_hwy_config;

  const res = {
    clientLib: internal_hwy_config?.clientLib || "htmx",
    dev: {
      port: Number(internal_hwy_config?.dev?.port || DEFAULT_PORT),
      watchExclusions: internal_hwy_config?.dev?.watchExclusions || [],
      hotReloadCssBundle:
        internal_hwy_config?.dev?.hotReloadCssBundle === false ? false : true,
    },
    deploymentTarget: internal_hwy_config?.deploymentTarget || "node",
    routeStrategy: internal_hwy_config?.routeStrategy || "always-lazy",
    useDotServerFiles:
      internal_hwy_config?.clientLib === "preact"
        ? true
        : internal_hwy_config?.useDotServerFiles || false,
  };

  // delete the file now that we're done with it
  fs.unlinkSync(path_to_config_in_dist);

  return res;

  // return (globalThis as any).cached_hwy_config;
}

export { get_hwy_config };
export type { HwyConfig };
