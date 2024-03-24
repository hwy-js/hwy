import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { HWY_GLOBAL_KEYS } from "../../common/index.mjs";
import { getHashedPublicURLLowLevel } from "./hashed-public-url.js";

/*
NOTE: This file assumes it's run (and therefore imported / initiated)
only after the public-map.js file has been generated. That means you
should import it lazily and only after the public-map.js file has been
generated.
*/

const publicMapPath = path.resolve("dist", "public-map.js");

const publicMap: Record<string, string> | undefined = (
  await import(pathToFileURL(publicMapPath).href)
)[HWY_GLOBAL_KEYS.publicMap];

const URL_REGEX = /url\(\s*(?:(['"]?)(.*?)\1)\s*\)/gi;

export async function bundleCSSFiles() {
  const usingStylesDir = fs.existsSync(path.resolve("./src/styles"));
  if (!usingStylesDir) {
    await Promise.all([writeCriticalBundledCSSIsUndefined()]);
    return;
  }

  async function buildNormalCSS() {
    const normalPath = path.resolve("src/styles/normal");
    const normalExists = fs.existsSync(normalPath);
    if (!normalExists) {
      return;
    }
    const normalFiles = await fs.promises.readdir(normalPath);
    const normalCSSPaths = normalFiles
      .filter((file) => file.endsWith(".css"))
      .map((file) => path.join(normalPath, file))
      .sort();

    const promises = await Promise.all(
      normalCSSPaths.map((x) => fs.promises.readFile(x, "utf-8")),
    );

    const normalCSSText = promises.join("\n").replace(URL_REGEX, replacer);

    if (normalCSSPaths.length) {
      await Promise.all([
        esbuild.build({
          stdin: {
            contents: normalCSSText,
            resolveDir: path.resolve("src/styles"),
            loader: "css",
          },
          outfile: path.resolve("public/dist/standard-bundled.css"),
          minify: true,
        }),
      ]);
    }
  }

  async function buildCriticalCSS() {
    const criticalPath = path.resolve("src/styles/critical");
    const criticalExists = fs.existsSync(criticalPath);
    if (!criticalExists) {
      await writeCriticalBundledCSSIsUndefined();
      return;
    }
    const criticalFiles = await fs.promises.readdir(criticalPath);
    const criticalCSSPaths = criticalFiles
      .filter((file) => file.endsWith(".css"))
      .map((file) => path.join(criticalPath, file))
      .sort();

    const promises = await Promise.all(
      criticalCSSPaths.map((x) => fs.promises.readFile(x, "utf-8")),
    );

    const criticalCSSText = promises.join("\n").replace(URL_REGEX, replacer);

    if (criticalCSSPaths.length) {
      const result = await esbuild.build({
        stdin: {
          contents: criticalCSSText,
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
        `export const ${HWY_GLOBAL_KEYS.criticalBundledCSS} = \`${css}\`;`,
      );

      return css;
    } else {
      await writeCriticalBundledCSSIsUndefined();
    }
  }

  const [_, criticalCSS] = await Promise.all([
    buildNormalCSS(),
    buildCriticalCSS(),
  ]);

  return { criticalCSS };
}

function replacer(_: string, __: string, p2: string) {
  if (!publicMap) {
    throw new Error("No public map found");
  }

  const hashed = getHashedPublicURLLowLevel({
    publicMap,
    url: p2,
  });

  return `url("${hashed}")`;
}

async function writeCriticalBundledCSSIsUndefined() {
  return fs.promises.writeFile(
    path.join(process.cwd(), "dist/critical-bundled-css.js"),
    `export const ${HWY_GLOBAL_KEYS.criticalBundledCSS} = undefined;`,
  );
}
