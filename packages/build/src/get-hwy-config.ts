import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { hwyLog } from "../../common/dev.mjs";
import { type HwyConfig } from "../../common/index.mjs";

let cachedHwyConfig: HwyConfig | undefined;

const jsPath = path.join(process.cwd(), "hwy.config.js");
const tsPath = path.join(process.cwd(), "hwy.config.ts");
const tsconfigExists = fs.existsSync(tsPath);
const distDirPath = path.join(process.cwd(), "dist");
const distDirExists = fs.existsSync(distDirPath);

async function getHwyConfig() {
  if (cachedHwyConfig) {
    return cachedHwyConfig;
  }

  if (!distDirExists) {
    await fs.promises.mkdir(distDirPath, { recursive: true });
  }

  await esbuild.build({
    entryPoints: [tsconfigExists ? tsPath : jsPath],
    bundle: true,
    outdir: path.resolve("dist"),
    treeShaking: true,
    platform: "node",
    format: "esm",
    packages: "external",
  });

  const pathToConfigInDist = path.join(distDirPath, "hwy.config.js");
  const fullURLToImport = pathToFileURL(pathToConfigInDist).href;
  const imported = await import(fullURLToImport);
  const internalHwyConfig = imported.default as HwyConfig | undefined;

  if (internalHwyConfig && typeof internalHwyConfig !== "object") {
    throw new Error("hwy.config must export an object");
  }

  const isUsingClientSideReact = internalHwyConfig?.useClientSideReact === true;

  if (isUsingClientSideReact && internalHwyConfig?.useDotServerFiles !== true) {
    hwyLog.warning(
      "When using client-side React, 'hwyConfig.useDotServerFiles' is effectively always set to true.",
      "This helps keep your server code out of your client bundle.",
      "To quiet this warning, explicitly set 'useDotServerFiles' to true in your Hwy config.",
    );
  }

  cachedHwyConfig = {
    dev: {
      watchExclusions: internalHwyConfig?.dev?.watchExclusions || [],
      watchInclusions: internalHwyConfig?.dev?.watchInclusions || [],
      hotReloadStyles:
        internalHwyConfig?.dev?.hotReloadStyles === false ? false : true,
    },
    routeStrategy: internalHwyConfig?.routeStrategy || "always-lazy",
    useClientSideReact: isUsingClientSideReact as any,
    useDotServerFiles: isUsingClientSideReact
      ? true
      : internalHwyConfig?.useDotServerFiles || false,
    scriptsToInject: internalHwyConfig?.scriptsToInject || [],
  } satisfies HwyConfig;

  // delete the file now that we're done with it
  await fs.promises.unlink(pathToConfigInDist);

  return cachedHwyConfig as HwyConfig;
}

export { getHwyConfig };
export type { HwyConfig };
