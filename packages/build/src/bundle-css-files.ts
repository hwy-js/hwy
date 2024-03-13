import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { HWY_GLOBAL_KEYS } from "../../common/index.mjs";
import { get_hashed_public_url_low_level } from "./hashed-public-url.js";

/*
NOTE: This file assumes it's run (and therefore imported / initiated)
only after the public-map.js file has been generated. That means you
should import it lazily and only after the public-map.js file has been
generated.
*/

const public_map_path = path.resolve("dist", "public-map.js");

const public_map: Record<string, string> | undefined = (
  await import(pathToFileURL(public_map_path).href)
)[HWY_GLOBAL_KEYS.public_map];

const URL_REGEX = /url\(\s*(?:(['"]?)(.*?)\1)\s*\)/gi;

function replacer(_: string, __: string, p2: string) {
  if (!public_map) {
    throw new Error("No public map found");
  }

  const hashed = get_hashed_public_url_low_level({
    public_map,
    url: p2,
  });

  return `url("${hashed}")`;
}

async function bundle_css_files() {
  const using_styles_dir = fs.existsSync(path.resolve("./src/styles"));
  if (!using_styles_dir) {
    await Promise.all([write_critical_bundled_css_is_undefined()]);
    return;
  }

  async function build_normal_css() {
    const normal_path = path.resolve("src/styles/normal");
    const normal_exists = fs.existsSync(normal_path);
    if (!normal_exists) {
      return;
    }
    const normal_files = await fs.promises.readdir(normal_path);
    const normal_css_paths = normal_files
      .filter((file) => file.endsWith(".css"))
      .map((file) => path.join(normal_path, file))
      .sort();

    const promises = await Promise.all(
      normal_css_paths.map((x) => fs.promises.readFile(x, "utf-8")),
    );

    const normal_css_text = promises.join("\n").replace(URL_REGEX, replacer);

    if (normal_css_paths.length) {
      await Promise.all([
        esbuild.build({
          stdin: {
            contents: normal_css_text,
            resolveDir: path.resolve("src/styles"),
            loader: "css",
          },
          outfile: path.resolve("public/dist/standard-bundled.css"),
          minify: true,
        }),
      ]);
    }
  }

  async function build_critical_css() {
    const critical_path = path.resolve("src/styles/critical");
    const critical_exists = fs.existsSync(critical_path);
    if (!critical_exists) {
      await write_critical_bundled_css_is_undefined();
      return;
    }
    const critical_files = await fs.promises.readdir(critical_path);
    const critical_css_paths = critical_files
      .filter((file) => file.endsWith(".css"))
      .map((file) => path.join(critical_path, file))
      .sort();

    const promises = await Promise.all(
      critical_css_paths.map((x) => fs.promises.readFile(x, "utf-8")),
    );

    const critical_css_text = promises.join("\n").replace(URL_REGEX, replacer);

    if (critical_css_paths.length) {
      const result = await esbuild.build({
        stdin: {
          contents: critical_css_text,
          resolveDir: path.resolve("src/styles"),
          loader: "css",
        },
        write: false,
        minify: true,
      });

      if (result.errors.length) {
        console.error(result.errors.join("\n"));
      }

      const css = result.outputFiles[0].text.trim();

      await fs.promises.writeFile(
        path.join(process.cwd(), "dist/critical-bundled-css.js"),
        `export const ${HWY_GLOBAL_KEYS.critical_bundled_css} = \`${css}\`;`,
      );

      return css;
    } else {
      await write_critical_bundled_css_is_undefined();
    }
  }

  const [_, critical_css] = await Promise.all([
    build_normal_css(),
    build_critical_css(),
  ]);

  return { critical_css };
}

export { bundle_css_files };

async function write_critical_bundled_css_is_undefined() {
  return fs.promises.writeFile(
    path.join(process.cwd(), "dist/critical-bundled-css.js"),
    `export const ${HWY_GLOBAL_KEYS.critical_bundled_css} = undefined;`,
  );
}
