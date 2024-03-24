import { exec as execCallback } from "child_process";
import esbuild from "esbuild";
import { parse as jsonCParse } from "jsonc-parser";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { hwyLog, logPerf } from "../../common/dev.mjs";
import {
  HWY_GLOBAL_KEYS,
  HWY_PREFIX,
  type RefreshFilePayload,
} from "../../common/index.mjs";
import { getIsHotReloadOnly } from "./dev-serve.js";
import { getHwyConfig } from "./get-hwy-config.js";
import {
  genPublicFileMap,
  sha1Short,
  writePathsToDisk,
  type Paths,
} from "./walk-pages.js";

const tsconfigPath = path.resolve("tsconfig.json");
let tsconfig = jsonCParse(fs.readFileSync(tsconfigPath, "utf8")) as Record<
  string,
  unknown
>;

function getEsbuildBuildArgsBase(isDev: boolean | undefined) {
  return {
    format: "esm",
    bundle: true,
    treeShaking: true,
    define: {
      "process.env.NODE_ENV": isDev ? '"development"' : '"production"',
    },
    sourcemap: isDev ? "inline" : false,
    minify: !isDev,
    tsconfigRaw: tsconfig,
  } as const satisfies esbuild.BuildOptions;
}

// If verbatimModuleSyntax is true, then esbuild fails to strip server code :-/
if (tsconfig.compilerOptions) {
  (tsconfig.compilerOptions as any).verbatimModuleSyntax = false;
}

const filenames = [
  "critical-bundled-css.js",
  "paths.js",
  "public-map.js",
  "public-reverse-map.js",
] as const;

const exec = promisify(execCallback);
const hwyConfig = await getHwyConfig();
const shouldBundlePaths = hwyConfig.routeStrategy === "bundle";
async function runBuildTasks({
  isDev,
  log,
  changeType,
}: {
  isDev?: boolean;
  log?: string;
  changeType?: RefreshFilePayload["changeType"];
}) {
  const isUsingClientSideReact = hwyConfig.useClientSideReact;

  // IDEA -- Should probably split "pre-build" into CSS pre-processing and other pre-processing
  hwyLog.info(`new build initiated${log ? ` (${log})` : ""}`);
  await handlePreBuild({ isDev });

  const hotReloadOnly = getIsHotReloadOnly(changeType);

  if (hotReloadOnly) {
    /*
     * Why is "bundleCSSFiles" dynamically imported here?
     * That file needs to only run once you have a public-map.js file.
     * In this case, you're hot reloading, so we expect you to already
     * have the public-map.js file generated.
     */
    const { bundleCSSFiles } = await import("./bundle-css-files.js");

    const cssBundleRes = await bundleCSSFiles();

    await writeRefreshTxt({
      changeType,
      criticalCss: cssBundleRes?.criticalCSS,
    });

    return;
  }

  hwyLog.info(`running standard build tasks`);
  const stdTasksP0 = performance.now();

  const distDir = path.join(process.cwd(), "dist");
  const distExists = fs.existsSync(distDir);
  const publicDistDir = path.join(process.cwd(), "public/dist");
  const publicDistExists = fs.existsSync(publicDistDir);

  // delete dist and public/dist folders
  await Promise.all([
    distExists && fs.promises.rm(distDir, { recursive: true }),
    publicDistExists &&
      fs.promises.rm(publicDistDir, {
        recursive: true,
      }),
  ]);

  // recreate them
  await Promise.all([
    fs.promises.mkdir(distDir, { recursive: true }),
    fs.promises.mkdir(publicDistDir, {
      recursive: true,
    }),
  ]);

  /********************* STEP 1 *********************
   * GENERATE PUBLIC FILE MAP -- TAKE 1
   */
  await genPublicFileMap();

  /*
   * Why is "bundleCSSFiles" dynamically imported here?
   * Needs to come after generating the public file map,
   * which now we have just done above.
   */
  const { bundleCSSFiles } = await import("./bundle-css-files.js");

  /********************* STEP 2 *********************
   * BUNDLE CSS FILES AND CLIENT ENTRY
   */

  await Promise.all([
    bundleCSSFiles(),

    ...(hwyConfig.scriptsToInject ?? []).map(async (item) => {
      return fs.promises.copyFile(
        path.join(process.cwd(), item),
        path.join(process.cwd(), "public/dist", sha1Short(item) + ".js"),
      );
    }),
  ]);

  const injectedScripts = (hwyConfig.scriptsToInject ?? []).map(
    (item) => "dist/" + sha1Short(item) + ".js",
  );

  /********************* STEP 3 *********************
   * BUILD SERVER ENTRY AND WRITE PATHS TO DISK
   */

  const { pageFilesList, clientFilesList, serverFilesList } =
    await writePathsToDisk();

  await esbuild.build({
    ...getEsbuildBuildArgsBase(isDev),
    entryPoints: [
      path.resolve("src/main.*"),
      ...pageFilesList.map((x) => x.importPathWithOrigExt),
      ...serverFilesList.map((x) => x.importPathWithOrigExt),
    ],
    outdir: path.resolve("dist"),
    platform: "node",
    write: true,
    packages: "external",
    splitting: true,
  });

  ///////////////////////////////////////////////////////////////////////////
  ///////////////////////////////// STEP 3.5 -- AND NOW THE CLIENT FILES
  ///////////////////////////////////////////////////////////////////////////

  const clientEntryExt = getClientEntryExtension();
  const isUsingClientEntry = !!clientEntryExt;

  await esbuild.build({
    ...getEsbuildBuildArgsBase(isDev),
    entryPoints: [
      ...(isUsingClientEntry
        ? [path.join(process.cwd(), "src/entry.client" + clientEntryExt)]
        : []),
      ...(isUsingClientSideReact ? pageFilesList : []).map(
        (x) => x.importPathWithOrigExt,
      ),
      ...clientFilesList.map((x) => x.importPathWithOrigExt),
    ],
    outdir: publicDistDir,
    platform: "browser",
    splitting: true,
    chunkNames: "hwy_chunk__[hash]",
    outbase: path.join(process.cwd(), "src"),
  });

  /////////////////////////////////////////////////////////////////////////////

  /********************* STEP 4 *********************
   * GENERATE PUBLIC FILE MAP -- TAKE 2
   *
   * Needs to come after writing paths to disk.
   * This is because the client scripts are written during walkPages inside writePathsToDisk.
   * This is the last time we generate the public file map -- now final
   */
  await genPublicFileMap();

  /********************* STEP 5 *********************
   * PREPARE AND WRITE SERVER ENTRY CODE TO DISK
   *
   * Recall that our server entry code is in memory at this point.
   * We're going to modify it and write it to disk.
   */

  // Grab the specific build output we need -- server entry code
  let mainCode = await fs.promises.readFile(
    path.join(process.cwd(), "dist/main.js"),
    "utf8",
  );

  /*
   * Grab the rest of the build outputs (previously written to disk)
   * as text in memory. This is a string array.
   */
  let filesText = await Promise.all(
    filenames.map((filename) => {
      return fs.promises.readFile(
        path.join(process.cwd(), `dist/${filename}`),
        "utf-8",
      );
    }),
  );

  /*
   * This effectively puts each piece of our build outputs into a globally
   * accessible variable. This is how we can access things like the CSS
   * bundle and the public file map at runtime when we need them.
   */
  filesText = filesText.map((x, i) => {
    return x.replace("export const ", `${HWY_PREFIX}arbitraryGlobal.`);
  });

  /*
   * Prepare to append those file contents into main server entry code.
   * This is now one big string, separated by double newlines.
   */
  let toBeAppended = filesText.join("\n\n") + "\n\n";

  /*
   * Set up some additional global variables
   * This is how we can know these settings at runtime
   */
  const warmupLine = `
if (!globalThis[Symbol.for("${HWY_PREFIX}")]) {
  globalThis[Symbol.for("${HWY_PREFIX}")] = {};
}

const ${HWY_PREFIX}arbitraryGlobal = globalThis[Symbol.for("${HWY_PREFIX}")];

`;

  const devLine = `${HWY_PREFIX}arbitraryGlobal.${HWY_GLOBAL_KEYS.isDev} = ${isDev};\n\n`;

  const hwyConfigLine = `${HWY_PREFIX}arbitraryGlobal.${
    HWY_GLOBAL_KEYS.hwyConfig
  } = ${JSON.stringify(hwyConfig)};\n\n`;

  const injectedScriptsLine = `${HWY_PREFIX}arbitraryGlobal.${
    HWY_GLOBAL_KEYS.injectedScripts
  } = ${JSON.stringify(injectedScripts)};\n\n`;

  const buildIDLine = `${HWY_PREFIX}arbitraryGlobal.${HWY_GLOBAL_KEYS.buildID} = ${Date.now().toString()};\n\n`;

  /*
   * Now put it all together and write main.js to disk
   */
  await fs.promises.writeFile(
    path.join(process.cwd(), "dist/main.js"),
    warmupLine +
      devLine +
      hwyConfigLine +
      injectedScriptsLine +
      buildIDLine +
      toBeAppended +
      mainCode,
  );

  /*
   * Now we have our baseline main.js code in the dist folder on disk.
   */

  /********************* STEP 6 *********************
   * APPEND ROUTE LOADING STRATEGY CODE TO SERVER ENTRY
   *
   * Only applicable for "bundle" and "warm-cache-at-startup" route loading strategies.
   */
  if (
    shouldBundlePaths ||
    hwyConfig.routeStrategy === "warm-cache-at-startup"
  ) {
    await handleCustomRouteLoadingCode(isDev);
  }

  if (isDev) {
    await writeRefreshTxt({ changeType: "standard" });
  }

  const stdTasksP1 = performance.now();

  logPerf("standard build tasks", stdTasksP0, stdTasksP1);
}

export { runBuildTasks };

/* -------------------------------------------------------------------------- */

async function handlePreBuild({ isDev }: { isDev?: boolean }) {
  try {
    const pkgJSON = JSON.parse(
      await fs.promises.readFile(
        path.join(process.cwd(), "package.json"),
        "utf-8",
      ),
    );
    const prebuildScript = pkgJSON.scripts?.["hwy-prebuild"];
    const prebuildDevScript = pkgJSON.scripts?.["hwy-prebuild-dev"];

    if (!prebuildScript && !prebuildDevScript) {
      return;
    }

    const shouldUseDevScript = isDev && prebuildDevScript;
    const scriptToRun = shouldUseDevScript ? prebuildDevScript : prebuildScript;
    if (!scriptToRun) {
      return;
    }

    hwyLog.info(`running ${scriptToRun}`);

    const prebuildP0 = performance.now();

    const { stdout, stderr } = await exec(scriptToRun);

    const prebuildP1 = performance.now();

    console.log(stdout);

    if (stderr) {
      console.error(stderr);
    }

    logPerf("pre-build tasks", prebuildP0, prebuildP1);
  } catch (error) {
    console.error("Error running pre-build tasks:", error);
  }
}

/* -------------------------------------------------------------------------- */

async function writeRefreshTxt({
  changeType,
  criticalCss,
}: {
  changeType: RefreshFilePayload["changeType"];
  criticalCss?: string;
}) {
  await fs.promises.writeFile(
    path.join(process.cwd(), "dist", "refresh.txt"),
    JSON.stringify({
      changeType,
      criticalCss,
      at: Date.now().toString(),
    } satisfies RefreshFilePayload),
  );
}

/* -------------------------------------------------------------------------- */

function toVarName(filename: string) {
  return (
    HWY_PREFIX +
    filename
      .replace(/-/g, "_")
      .replace(".js", "")
      .replace(/\//g, "")
      .replace(/\./g, "_")
  );
}

/* -------------------------------------------------------------------------- */

function getClientEntryExtension() {
  const extsWithDot = [".js", ".ts", ".jsx", ".tsx"] as const;
  for (const ending of extsWithDot) {
    if (fs.existsSync(path.join(process.cwd(), `src/entry.client${ending}`))) {
      return ending;
    }
  }
}

/* -------------------------------------------------------------------------- */

async function getPathImportSnippet() {
  if (hwyConfig.routeStrategy === "warm-cache-at-startup") {
    return `
${HWY_PREFIX}arbitraryGlobal.${HWY_GLOBAL_KEYS.paths}.forEach(function (x) {
  const pathFromDist = "./" + x.importPath;
  import(pathFromDist).then((x) => ${HWY_PREFIX}arbitraryGlobal[pathFromDist] = x);
  ${
    hwyConfig.useDotServerFiles
      ? `
  if (x.hasSiblingServerFile) {
    const serverPathFromDist = pathFromDist.replace(".page.js", ".server.js");
    import(serverPathFromDist).then((x) => ${HWY_PREFIX}arbitraryGlobal[serverPathFromDist] = x);
  }
    `.trim() + "\n"
      : ""
  }
});
        `.trim();
  }

  if (shouldBundlePaths) {
    // Read the paths from disk. Results in an array of path objects.
    const pathsImportList = (
      await import(
        pathToFileURL(path.join(process.cwd(), "dist/paths.js")).href
      )
    )[HWY_GLOBAL_KEYS.paths] as Paths;

    /*
     * For bundling strategy, we want to literally import all the contents of each path file
     * and put them into a global variable. This is how we can access each route at runtime.
     * This is the snippet that will be appended to main.js for the "bundle" route loading strategy
     */
    return pathsImportList
      .map((x) => {
        const asVar = toVarName(x.importPath);
        const line1 = `import * as ${asVar} from "./${x.importPath}";\n`;
        const line2 = `${HWY_PREFIX}arbitraryGlobal["./${x.importPath}"] = ${asVar};`;

        if (x.hasSiblingServerFile) {
          const importPathServer = x.importPath.replace(
            ".page.js",
            ".server.js",
          );
          const asVarServer = toVarName(importPathServer);
          const line3 = `import * as ${asVarServer} from "./${importPathServer}";\n`;
          const line4 = `${HWY_PREFIX}arbitraryGlobal["./${importPathServer}"] = ${asVarServer};`;
          return line1 + line2 + "\n" + line3 + line4;
        }

        return line1 + line2;
      })
      .join("\n");
  }

  return "";
}

/* -------------------------------------------------------------------------- */

async function handleCustomRouteLoadingCode(isDev?: boolean) {
  // Write the final main.js to disk again, with the route loading strategy appended
  await fs.promises.writeFile(
    "dist/main.js",
    (await fs.promises.readFile("./dist/main.js", "utf8")) +
      "\n" +
      (await getPathImportSnippet()),
  );

  /*
   * Bundle paths with server entry, if applicable.
   * Needs to come after appending route loading strategy.
   */
  if (shouldBundlePaths) {
    await esbuild.build({
      ...getEsbuildBuildArgsBase(isDev),
      entryPoints: [path.resolve("dist/main.js")],
      outfile: path.resolve("dist/main.js"),
      platform: "node",
      write: true,
      packages: "external",
      allowOverwrite: true,
    });

    // rmv dist/pages folder -- no longer needed if bundling routes
    await fs.promises.rm(path.join(process.cwd(), "dist/pages"), {
      recursive: true,
    });
  }

  // rmv the rest
  await Promise.all(
    filenames.map((x) => {
      return fs.promises.rm(path.join(process.cwd(), `dist/${x}`));
    }),
  );
}
