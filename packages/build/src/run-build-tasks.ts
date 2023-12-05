import path from "node:path";
import fs from "node:fs";
import {
  generate_public_file_map,
  write_paths_to_disk,
  type Paths,
} from "./walk-pages.js";
import esbuild from "esbuild";
import { hwyLog, logPerf } from "./hwy-log.js";
import { exec as exec_callback } from "child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import {
  HWY_GLOBAL_KEYS,
  HWY_PREFIX,
  type RefreshFilePayload,
} from "../../common/index.mjs";
import { get_hwy_config } from "./get-hwy-config.js";
import { smart_normalize } from "./smart-normalize.js";
import { get_is_hot_reload_only } from "./dev-serve.js";

const FILE_NAMES = [
  "critical-bundled-css.js",
  "paths.js",
  "public-map.js",
  "public-reverse-map.js",
  "standard-bundled-css-exists.js",
] as const;

const exec = promisify(exec_callback);
const hwy_config = await get_hwy_config();
const SHOULD_BUNDLE_PATHS =
  hwy_config.routeStrategy === "bundle" ||
  hwy_config.deploymentTarget === "cloudflare-pages";

async function runBuildTasks({
  log,
  isDev,
  changeType,
}: {
  isDev: boolean;
  log?: string;
  changeType?: RefreshFilePayload["changeType"];
}) {
  const IS_DEV = isDev;
  const IS_PROD = !isDev;

  hwyLog(`New build initiated${log ? ` (${log})` : ""}`);
  await handle_prebuild({ is_dev: IS_DEV });

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

    write_refresh_txt({
      changeType,
      criticalCss: css_bundle_res?.critical_css,
    });

    return;
  }

  hwyLog(`Running standard build tasks...`);
  const standard_tasks_p0 = performance.now();
  const dist_path = path.join(process.cwd(), "dist");
  fs.mkdirSync(dist_path, { recursive: true });
  const is_using_client_entry = get_is_using_client_entry();

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

    is_using_client_entry
      ? esbuild.build({
          entryPoints: ["src/client.entry.*"],
          bundle: true,
          outdir: "public/dist",
          treeShaking: true,
          platform: "browser",
          format: "esm",
          minify: true,
        })
      : undefined,
  ]);

  /********************* STEP 3 *********************
   * BUILD SERVER ENTRY AND WRITE PATHS TO DISK
   *
   * Note that we're putting the server entry code into memory
   * at this point, and not yet writing it to disk. We'll modify
   * it and write it to disk later.
   */
  const [main_build_result] = await Promise.all([
    esbuild.build({
      entryPoints: ["src/main.*"],
      bundle: true,
      outdir: "dist",
      treeShaking: true,
      platform: "node",
      format: "esm",
      minify: false,
      write: false,
      packages: "external",
    }),

    write_paths_to_disk(),
  ]);

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
  let main_code = main_build_result.outputFiles?.[0].text;

  /*
   * Grab the rest of the build outputs (previously written to disk)
   * as text in memory. This is a string array.
   */
  let files_text = await Promise.all(
    FILE_NAMES.map((file_name) => {
      return fs.readFileSync(
        path.join(process.cwd(), `dist/${file_name}`),
        "utf-8",
      );
    }),
  );

  /*
   * Remove "export " from each file representation
   * so we can append them to the server entry code
   */
  files_text = files_text.map((x, i) => {
    return x.replace("export ", "");
  });

  /*
   * Prepare to append those file contents into main server entry code
   *
   * The "smart normalize" function only matters for people dev'ing on
   * Windows and deploying to Cloudflare Pages.
   *
   * This is now one big string, separated by double newlines.
   */
  let to_be_appended = smart_normalize(files_text.join("\n\n"));

  /*
   * This effectively puts each piece of our build outputs into a globally
   * accessible variable. This is how we can access things like the CSS
   * bundle and the public file map at runtime when we need them.
   */
  to_be_appended =
    to_be_appended +
    `\n\n` +
    FILE_NAMES.map((x) => {
      const var_name = convert_to_var_name(x);
      return `globalThis["${var_name}"] = ${var_name};`;
    }).join("\n") +
    "\n\n";

  /*
   * Set up some additional global variables
   * Includes "is_dev", "deployment_target", and "route_strategy"
   * This is how we can know these settings at runtime
   */
  const dev_line = `globalThis.${HWY_GLOBAL_KEYS.is_dev} = ${IS_DEV};\n`;
  const dep_target_line = `globalThis.${HWY_GLOBAL_KEYS.deployment_target} = "${hwy_config.deploymentTarget}";\n\n`;
  const route_strategy_line = `globalThis.${HWY_GLOBAL_KEYS.route_strategy} = "${hwy_config.routeStrategy}";\n\n`;

  /*
   * Now put it all together and write main.js to disk
   */
  fs.writeFileSync(
    path.join(process.cwd(), "dist/main.js"),
    dev_line +
      dep_target_line +
      route_strategy_line +
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
    await handle_custom_route_loading_code();
  }

  // If PROD, handle deploy target revisions
  if (IS_PROD) {
    // VERCEL
    if (hwy_config.deploymentTarget === "vercel-lambda") {
      hwyLog("Customizing build output for Vercel Serverless (Lambda)...");

      fs.cpSync("./dist", "./api", { recursive: true });
    }

    // DENO DEPLOY
    if (hwy_config.deploymentTarget === "deno-deploy") {
      // Needs to come after any bundling!
      await handle_deno_deploy_hacks();
    }
  }

  if (IS_DEV) {
    write_refresh_txt({ changeType: "standard" });
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

  fs.writeFileSync(
    main_path,
    fs.readFileSync(main_path, "utf8") +
      "\n" +
      get_code([...public_paths, ...FILE_NAMES.map((x) => "./" + x)]),
  );
}

/* -------------------------------------------------------------------------- */

function handle_cloudflare_pages_hacks(path_import_snippet_bundle: string) {
  hwyLog("Customizing build output for Cloudflare Pages...");

  fs.writeFileSync(
    "dist/_worker.js",
    `import process from "node:process";\n` +
      `globalThis.process = process;\n` +
      fs.readFileSync("./dist/main.js", "utf8") +
      "\n" +
      path_import_snippet_bundle,
  );

  // copy public folder into dist
  fs.cpSync("./public", "./dist/public", { recursive: true });

  if (hwy_config.routeStrategy !== "bundle") {
    // Everything is bundled anyway if target is cloudflare-pages
    hwyLog(
      "Setting routeStrategy has no effect when deploymentTarget is cloudflare-pages. It will always effectively be 'bundle'.",
    );
  }
}

/* -------------------------------------------------------------------------- */

async function handle_prebuild({ is_dev }: { is_dev: boolean }) {
  try {
    const pkg_json = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"),
    );
    const prebuild_script = pkg_json.scripts?.["hwy-prebuild"];
    const prebuild_dev_script = pkg_json.scripts?.["hwy-prebuild-dev"];

    if (!prebuild_script && !prebuild_dev_script) {
      return;
    }

    const should_use_dev_script = is_dev && prebuild_dev_script;

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

function write_refresh_txt({
  changeType,
  criticalCss,
}: {
  changeType: RefreshFilePayload["changeType"];
  criticalCss?: string;
}) {
  fs.writeFileSync(
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
    file_name.replace(/-/g, "_").replace(".js", "").replace(/\//g, "")
  );
}

/* -------------------------------------------------------------------------- */

function get_is_using_client_entry() {
  const file_endings = [".js", ".ts", ".jsx", ".tsx"];

  for (const ending of file_endings) {
    if (fs.existsSync(path.join(process.cwd(), `src/client.entry${ending}`))) {
      return true;
    }
  }
}

/* -------------------------------------------------------------------------- */

async function get_path_import_snippet() {
  if (hwy_config.routeStrategy === "warm-cache-at-startup") {
    return `
__hwy__paths.forEach(function (x) {
  const path_from_dist = "./" + x.importPath;
  import(path_from_dist).then((x) => globalThis[path_from_dist] = x);
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
        return `
import * as ${convert_to_var_name(x.importPath)} from "./${x.importPath}";
globalThis["./${x.importPath}"] = ${convert_to_var_name(x.importPath)};
      `.trim();
      })
      .join("\n");
  }

  return "";
}

/* -------------------------------------------------------------------------- */

async function handle_custom_route_loading_code() {
  const path_import_snippet = await get_path_import_snippet();

  if (hwy_config.deploymentTarget === "cloudflare-pages") {
    // This writes the main server entry to disk as _worker.js
    handle_cloudflare_pages_hacks(path_import_snippet);
  } else {
    // Write the final main.js to disk again, with the route loading strategy appended
    fs.writeFileSync(
      "dist/main.js",
      fs.readFileSync("./dist/main.js", "utf8") + "\n" + path_import_snippet,
    );

    /*
     * Bundle paths with server entry, if applicable.
     * Needs to come after appending route loading strategy.
     */
    if (SHOULD_BUNDLE_PATHS) {
      await esbuild.build({
        entryPoints: ["dist/main.js"],
        bundle: true,
        outfile: "dist/main.js",
        treeShaking: true,
        platform: "node",
        format: "esm",
        minify: false,
        write: true,
        packages: "external",
        allowOverwrite: true,
      });

      // rmv dist/pages folder -- no longer needed if bundling routes
      fs.rmSync(path.join(process.cwd(), "dist/pages"), {
        recursive: true,
      });

      // rmv dist/paths.js file -- no longer needed if bundling routes
      fs.rmSync(path.join(process.cwd(), "dist/paths.js"));
    }
  }
}
