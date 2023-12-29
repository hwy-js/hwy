import { exec as exec_callback } from "child_process";
import esbuild from "esbuild";
import { parse as json_c_parse } from "jsonc-parser";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  HWY_GLOBAL_KEYS,
  HWY_PREFIX,
  hwyLog,
  logPerf,
  type RefreshFilePayload,
} from "../../common/index.mjs";
import { get_is_hot_reload_only } from "./dev-serve.js";
import { get_hwy_config } from "./get-hwy-config.js";
import { smart_normalize } from "./smart-normalize.js";
import {
  generate_public_file_map,
  sha1_short,
  write_paths_to_disk,
  type Paths,
} from "./walk-pages.js";

const tsconfig_path = path.resolve("tsconfig.json");
let tsconfig = json_c_parse(fs.readFileSync(tsconfig_path, "utf8")) as Record<
  string,
  unknown
>;

// If verbatimModuleSyntax is true, then esbuild fails to strip server code :-/
if (tsconfig.compilerOptions) {
  (tsconfig.compilerOptions as any).verbatimModuleSyntax = false;
}

const FILE_NAMES = [
  "critical-bundled-css.js",
  "paths.js",
  "public-map.js",
  "public-reverse-map.js",
] as const;

const exec = promisify(exec_callback);
const hwy_config = await get_hwy_config();
const SHOULD_BUNDLE_PATHS =
  hwy_config.routeStrategy === "bundle" ||
  hwy_config.deploymentTarget === "cloudflare-pages";

async function runBuildTasks({
  IS_DEV,
  log,
  changeType,
}: {
  IS_DEV?: boolean;
  log?: string;
  changeType?: RefreshFilePayload["changeType"];
}) {
  const IS_PROD = !IS_DEV;

  // IDEA -- Should probably split "pre-build" into CSS pre-processing and other pre-processing
  hwyLog(`New build initiated${log ? ` (${log})` : ""}`);
  await handle_prebuild({ IS_DEV });

  const HOT_RELOAD_ONLY = get_is_hot_reload_only(changeType);

  if (HOT_RELOAD_ONLY) {
    /*
     * Why is "bundle_css_files" dynamically imported here?
     * That file needs to only run once you have a public-map.js file.
     * In this case, you're hot reloading, so we expect you to already
     * have the public-map.js file generated.
     */
    const { bundle_css_files } = await import("./bundle-css-files.js");

    const css_bundle_res = await bundle_css_files();

    await write_refresh_txt({
      changeType,
      criticalCss: css_bundle_res?.critical_css,
    });

    return;
  }

  hwyLog(`Running standard build tasks...`);
  const standard_tasks_p0 = performance.now();

  await Promise.all([
    fs.promises.mkdir(path.join(process.cwd(), "dist"), { recursive: true }),
    fs.promises.mkdir(path.join(process.cwd(), "public/dist"), {
      recursive: true,
    }),
  ]);

  /********************* STEP 1 *********************
   * GENERATE PUBLIC FILE MAP -- TAKE 1
   */
  await generate_public_file_map();

  /*
   * Why is "bundle_css_files" dynamically imported here?
   * Needs to come after generating the public file map,
   * which now we have just done above.
   */
  const { bundle_css_files } = await import("./bundle-css-files.js");

  /********************* STEP 2 *********************
   * BUNDLE CSS FILES AND CLIENT ENTRY
   */

  await Promise.all([
    bundle_css_files(),

    ...(hwy_config.scriptsToInject ?? []).map(async (item) => {
      return fs.promises.copyFile(
        path.join(process.cwd(), item),
        path.join(process.cwd(), "public/dist", sha1_short(item) + ".js"),
      );
    }),
  ]);

  const injected_scripts = (hwy_config.scriptsToInject ?? []).map(
    (item) => "dist/" + sha1_short(item) + ".js",
  );

  /********************* STEP 3 *********************
   * BUILD SERVER ENTRY AND WRITE PATHS TO DISK
   *
   * Note that we're putting the server entry code into memory
   * at this point, and not yet writing it to disk. We'll modify
   * it and write it to disk later.
   */

  const { page_files_list, client_files_list, server_files_list } =
    await write_paths_to_disk(IS_DEV);

  await esbuild.build({
    // TO-DO -- customize entry point in Hwy Config
    entryPoints: [
      path.resolve("src/main.*"),
      ...page_files_list.map((x) => x.import_path_with_orig_ext),
      ...server_files_list.map((x) => x.import_path_with_orig_ext),
    ],
    bundle: true,
    outdir: path.resolve("dist"),
    treeShaking: true,
    platform: "node",
    format: "esm",
    minify: false,
    write: true,
    packages: "external",
    splitting: true,
    tsconfigRaw: tsconfig,
  });

  ///////////////////////////////////////////////////////////////////////////
  ///////////////////////////////// STEP 3.5 -- AND NOW THE CLIENT FILES
  ///////////////////////////////////////////////////////////////////////////

  const is_using_client_entry = get_is_using_client_entry();

  // mkdir
  await fs.promises.mkdir(
    path.join(process.cwd(), "public/dist/preact-compat"),
    {
      recursive: true,
    },
  );

  await Promise.all([
    esbuild.build({
      // TO-DO -- customize entry point in Hwy Config
      entryPoints: [
        ...(is_using_client_entry
          ? [path.join(process.cwd(), "src/entry.client.*")]
          : []),
        ...(hwy_config.useClientSidePreact ? page_files_list : []).map(
          (x) => x.import_path_with_orig_ext,
        ),
        ...client_files_list.map((x) => x.import_path_with_orig_ext),
      ],
      bundle: true,
      outdir: path.join(process.cwd(), "public/dist"),
      treeShaking: true,
      platform: "browser",
      format: "esm",
      minify: false, // true,
      splitting: true,
      chunkNames: "__hwy_chunk__[hash]",
      outbase: path.join(process.cwd(), "src"),
      external: [
        "@preact/signals",
        "preact",
        "preact/hooks",
        "preact/jsx-runtime",
        "preact/debug",
        "preact/compat",
        "@preact/compat",
      ],
      tsconfigRaw: tsconfig,
    }),

    // PREACT STUFF, WE WANT TO CLOSELY CONTROL PREACT BUNDLE AND HAVE ACCESS MODULES
    //  IN HEAD FROM IMPORT MAP, AND HAVE PREACT/DEBUG "JUST WORK"
    esbuild.build({
      stdin: {
        contents: ` export * from "@preact/signals";
                    export * from "preact";
                    export * from "preact/hooks";
                    export * from "preact/jsx-runtime";
                    ${IS_DEV ? `export * from "preact/debug";` : ""}`,
        resolveDir: path.join(process.cwd(), "dist"),
      },
      bundle: true,
      outfile: path.join(process.cwd(), "public/dist/client-signals.js"),
      treeShaking: true,
      platform: "browser",
      format: "esm",
      minify: false,
      splitting: false,
      tsconfigRaw: tsconfig,
    }),

    // compat layer
    fs.promises.copyFile(
      path.join(
        process.cwd(),
        "node_modules/preact/compat/dist/compat.module.js",
      ),
      path.join(process.cwd(), "public/dist/preact-compat/compat.module.js"),
    ),

    fs.promises.copyFile(
      path.join(
        process.cwd(),
        "node_modules/preact/compat/dist/compat.module.js.map",
      ),
      path.join(
        process.cwd(),
        "public/dist/preact-compat/compat.module.js.map",
      ),
    ),
  ]);

  /////////////////////////////////////////////////////////////////////////////

  /********************* STEP 4 *********************
   * GENERATE PUBLIC FILE MAP -- TAKE 2
   *
   * Needs to come after writing paths to disk.
   * This is because the client scripts are written during walk_pages inside write_paths_to_disk.
   * This is the last time we generate the public file map -- now final
   */
  await generate_public_file_map();

  /********************* STEP 5 *********************
   * PREPARE AND WRITE SERVER ENTRY CODE TO DISK
   *
   * Recall that our server entry code is in memory at this point.
   * We're going to modify it and write it to disk.
   */

  // Grab the specific build output we need -- server entry code
  let main_code = await fs.promises.readFile(
    path.join(process.cwd(), "dist/main.js"),
    "utf8",
  );

  /*
   * Grab the rest of the build outputs (previously written to disk)
   * as text in memory. This is a string array.
   */
  let files_text = await Promise.all(
    FILE_NAMES.map((file_name) => {
      return fs.promises.readFile(
        path.join(process.cwd(), `dist/${file_name}`),
        "utf-8",
      );
    }),
  );

  /*
   * This effectively puts each piece of our build outputs into a globally
   * accessible variable. This is how we can access things like the CSS
   * bundle and the public file map at runtime when we need them.
   */
  files_text = files_text.map((x, i) => {
    return x.replace("export const ", `${HWY_PREFIX}arbitrary_global.`);
  });

  /*
   * Prepare to append those file contents into main server entry code
   *
   * The "smart normalize" function only matters for people dev'ing on
   * Windows and deploying to Cloudflare Pages.
   *
   * This is now one big string, separated by double newlines.
   */
  let to_be_appended = smart_normalize(files_text.join("\n\n")) + "\n\n";

  /*
   * Set up some additional global variables
   * This is how we can know these settings at runtime
   */
  const warmup_line = `
if (!globalThis[Symbol.for("${HWY_PREFIX}")]) {
  globalThis[Symbol.for("${HWY_PREFIX}")] = {};
}

const ${HWY_PREFIX}arbitrary_global = globalThis[Symbol.for("${HWY_PREFIX}")];

`;

  const dev_line = `${HWY_PREFIX}arbitrary_global.${HWY_GLOBAL_KEYS.is_dev} = ${IS_DEV};\n\n`;

  const hwy_config_line = `${HWY_PREFIX}arbitrary_global.${
    HWY_GLOBAL_KEYS.hwy_config
  } = ${JSON.stringify(hwy_config)};\n\n`;

  const injected_scripts_line = `${HWY_PREFIX}arbitrary_global.${
    HWY_GLOBAL_KEYS.injected_scripts
  } = ${JSON.stringify(injected_scripts)};\n\n`;

  /*
   * Now put it all together and write main.js to disk
   */
  await fs.promises.writeFile(
    path.join(process.cwd(), "dist/main.js"),
    warmup_line +
      dev_line +
      hwy_config_line +
      injected_scripts_line +
      to_be_appended +
      main_code,
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
    SHOULD_BUNDLE_PATHS ||
    hwy_config.routeStrategy === "warm-cache-at-startup"
  ) {
    await handle_custom_route_loading_code(IS_DEV);
  }

  // If PROD, handle deploy target revisions
  if (IS_PROD) {
    // VERCEL
    if (hwy_config.deploymentTarget === "vercel-lambda") {
      hwyLog("Customizing build output for Vercel Serverless (Lambda)...");

      await fs.promises.cp("./dist", "./api", { recursive: true });
    }

    // DENO DEPLOY
    if (hwy_config.deploymentTarget === "deno-deploy") {
      // Needs to come after any bundling!
      await handle_deno_deploy_hacks();
    }
  }

  if (IS_DEV) {
    await write_refresh_txt({ changeType: "standard" });
  }

  const standard_tasks_p1 = performance.now();

  logPerf("standard build tasks", standard_tasks_p0, standard_tasks_p1);
}

export { runBuildTasks };

/* -------------------------------------------------------------------------- */

async function handle_deno_deploy_hacks() {
  hwyLog("Customizing build output for Deno Deploy...");

  function get_line(path_from_dist: string) {
    return `await import("${path_from_dist}"); `;
  }

  function get_code(paths: Array<string>) {
    const pre = "if (0 > 1) { try { ";
    const post = "} catch {} }";
    return pre + paths.map(get_line).join("") + post;
  }

  const public_paths = Object.keys(
    (
      await import(
        pathToFileURL(path.join(process.cwd(), "dist", "public-map.js")).href
      )
    )[HWY_GLOBAL_KEYS.public_map],
  ).map((x) => "../" + x);

  const main_path = path.join(process.cwd(), "dist", "main.js");

  await fs.promises.writeFile(
    main_path,
    (await fs.promises.readFile(main_path, "utf8")) +
      "\n" +
      get_code([...public_paths, ...FILE_NAMES.map((x) => "./" + x)]),
  );
}

/* -------------------------------------------------------------------------- */

async function handle_prebuild({ IS_DEV }: { IS_DEV?: boolean }) {
  try {
    const pkg_json = JSON.parse(
      await fs.promises.readFile(
        path.join(process.cwd(), "package.json"),
        "utf-8",
      ),
    );
    const prebuild_script = pkg_json.scripts?.["hwy-prebuild"];
    const prebuild_dev_script = pkg_json.scripts?.["hwy-prebuild-dev"];

    if (!prebuild_script && !prebuild_dev_script) {
      return;
    }

    const should_use_dev_script = IS_DEV && prebuild_dev_script;

    const script_to_run = should_use_dev_script
      ? prebuild_dev_script
      : prebuild_script;

    if (!script_to_run) {
      return;
    }

    hwyLog(`Running ${script_to_run}`);

    const prebuild_p0 = performance.now();

    const { stdout, stderr } = await exec(script_to_run);

    const prebuild_p1 = performance.now();

    console.log(stdout);

    if (stderr) {
      console.error(stderr);
    }

    logPerf("pre-build tasks", prebuild_p0, prebuild_p1);
  } catch (error) {
    console.error("Error running pre-build tasks:", error);
  }
}

/* -------------------------------------------------------------------------- */

async function write_refresh_txt({
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

function convert_to_var_name(file_name: string) {
  return (
    HWY_PREFIX +
    file_name
      .replace(/-/g, "_")
      .replace(".js", "")
      .replace(/\//g, "")
      .replace(/\./g, "_")
  );
}

/* -------------------------------------------------------------------------- */

function get_is_using_client_entry() {
  const file_endings = [".js", ".ts", ".jsx", ".tsx"];

  for (const ending of file_endings) {
    if (fs.existsSync(path.join(process.cwd(), `src/entry.client${ending}`))) {
      return true;
    }
  }
}

/* -------------------------------------------------------------------------- */

async function get_path_import_snippet() {
  if (hwy_config.routeStrategy === "warm-cache-at-startup") {
    return `
${HWY_PREFIX}paths.forEach(function (x) {
  const path_from_dist = "./" + x.importPath;
  import(path_from_dist).then((x) => ${HWY_PREFIX}arbitrary_global[path_from_dist] = x);
  ${
    hwy_config.useDotServerFiles
      ? `
  if (x.hasSiblingServerFile) {
    const server_path_from_dist = path_from_dist.slice(0, -3) + ".server.js";
    import(server_path_from_dist).then((x) => ${HWY_PREFIX}arbitrary_global[server_path_from_dist] = x);
  }
    `.trim() + "\n"
      : ""
  }
});
        `.trim();
  }

  if (SHOULD_BUNDLE_PATHS) {
    // Read the paths from disk. Results in an array of path objects.
    const paths_import_list = (
      await import(
        pathToFileURL(path.join(process.cwd(), "dist/paths.js")).href
      )
    )[HWY_GLOBAL_KEYS.paths] as Paths;

    /*
     * For bundling strategy, we want to literally import all the contents of each path file
     * and put them into a global variable. This is how we can access each route at runtime.
     * This is the snippet that will be appended to main.js for the "bundle" route loading strategy
     */
    return paths_import_list
      .map((x) => {
        const as_var = convert_to_var_name(x.importPath);
        const line_1 = `import * as ${as_var} from "./${x.importPath}";\n`;
        const line_2 = `${HWY_PREFIX}arbitrary_global["./${x.importPath}"] = ${as_var};`;

        if (x.hasSiblingServerFile) {
          const import_path_server = x.importPath.replace(
            ".page.js",
            ".server.js",
          );
          const as_var_server = convert_to_var_name(import_path_server);
          const line_3 = `import * as ${as_var_server} from "./${import_path_server}";\n`;
          const line_4 = `${HWY_PREFIX}arbitrary_global["./${import_path_server}"] = ${as_var_server};`;
          return line_1 + line_2 + "\n" + line_3 + line_4;
        }

        return line_1 + line_2;
      })
      .join("\n");
  }

  return "";
}

/* -------------------------------------------------------------------------- */

async function handle_custom_route_loading_code(IS_DEV?: boolean) {
  const IS_CLOUDFLARE = hwy_config.deploymentTarget === "cloudflare-pages";
  if (IS_CLOUDFLARE) {
    // This writes the main server entry to disk as _worker.js
    hwyLog("Customizing build output for Cloudflare Pages...");

    await Promise.all([
      fs.promises.writeFile(
        "dist/_worker.js",
        `import process from "node:process";\n` +
          `globalThis.process = process;\n` +
          fs.readFileSync("./dist/main.js", "utf8") +
          "\n" +
          (await get_path_import_snippet()),
      ),

      // copy public folder into dist
      fs.promises.cp("./public", "./dist/public", { recursive: true }),
    ]);

    // rmv dist/main.js file -- no longer needed if bundling routes
    await fs.promises.rm(path.join(process.cwd(), "dist/main.js"));
  } else {
    // Write the final main.js to disk again, with the route loading strategy appended
    await fs.promises.writeFile(
      "dist/main.js",
      (await fs.promises.readFile("./dist/main.js", "utf8")) +
        "\n" +
        (await get_path_import_snippet()),
    );
  }

  /*
   * Bundle paths with server entry, if applicable.
   * Needs to come after appending route loading strategy.
   */
  if (SHOULD_BUNDLE_PATHS) {
    await esbuild.build({
      entryPoints: [
        path.resolve(IS_CLOUDFLARE ? "dist/_worker.js" : "dist/main.js"),
      ],
      bundle: true,
      outfile: path.resolve(IS_CLOUDFLARE ? "dist/_worker.js" : "dist/main.js"),
      treeShaking: true,
      platform: "node",
      format: "esm",
      minify: false,
      write: true,
      packages: "external",
      allowOverwrite: true,
      tsconfigRaw: tsconfig,
    });

    // rmv dist/pages folder -- no longer needed if bundling routes
    await fs.promises.rm(path.join(process.cwd(), "dist/pages"), {
      recursive: true,
    });
  }

  // rmv the rest
  await Promise.all(
    FILE_NAMES.map((x) => {
      return fs.promises.rm(path.join(process.cwd(), `dist/${x}`));
    }),
  );
}
