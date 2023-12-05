import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import readdirp from "readdirp";
import esbuild from "esbuild";
import { HWY_GLOBAL_KEYS, SPLAT_SEGMENT } from "../../common/index.mjs";
import { smart_normalize } from "./smart-normalize.js";

const permitted_extensions = [
  "js",
  "jsx",
  "ts",
  "tsx",
  "mjs",
  "cjs",
  "mts",
  "cts",
];

type PathType =
  | "ultimate-catch"
  | "index"
  | "static-layout"
  | "dynamic-layout"
  | "non-ultimate-splat";

async function walk_pages() {
  const paths: {
    // ultimately public
    importPath: string;
    path: string;
    segments: Array<string | null>;
    pathType: PathType;
    hasSiblingClientFile: boolean;
  }[] = [];

  for await (const entry of readdirp(path.resolve("./src/pages"))) {
    const is_page_file = entry.path.includes(".page.");
    const is_client_file = entry.path.includes(".client.");

    if (!is_page_file && !is_client_file) {
      continue;
    }

    const ext = entry.path.split(".").pop();

    if (!ext || !permitted_extensions.includes(ext)) {
      continue;
    }

    const pre_ext_delineator = is_page_file ? ".page" : ".client";

    const _path = entry.path
      .replace("." + ext, "")
      .replace(pre_ext_delineator, "");

    const segments_init = _path.split(path.sep);

    let is_index = false;

    const segments = segments_init
      .filter((segment) => {
        if (segment.startsWith("__") && !segment.includes(".page.")) {
          return false;
        }
        return true;
      })
      .map((segment) => {
        let new_segment: string | null = segment.replace("$", ":");

        let is_splat = false;

        if (new_segment === ":") {
          new_segment = SPLAT_SEGMENT;
          is_splat = true;
        }

        if (new_segment === "_index") {
          new_segment = null;
          is_index = true;
        }

        type SegmentType = "normal" | "index" | "splat" | "dynamic";

        let segment_type: SegmentType = "normal";

        if (is_splat) {
          segment_type = "splat";
        } else if (new_segment?.startsWith(":")) {
          segment_type = "dynamic";
        } else if (is_index) {
          segment_type = "index";
        }

        return {
          segment: new_segment || undefined,
          segmentType: segment_type,
        };
      });

    const import_path_with_orig_ext =
      path.join(process.cwd(), "src/pages/" + _path) +
      pre_ext_delineator +
      ("." + ext);

    let path_to_use = "/" + segments.map((x) => x.segment).join("/");

    if (path_to_use !== "/" && path_to_use.endsWith("/")) {
      path_to_use = path_to_use.slice(0, -1);
    }

    if (is_page_file) {
      let has_sibling_client_file = false;

      for (const sibling of await fs.promises.readdir(
        path.dirname(import_path_with_orig_ext),
      )) {
        const filename = path.basename(_path);

        if (sibling.includes(filename + ".client.")) {
          has_sibling_client_file = true;
          break;
        }
      }

      let path_type: PathType = "static-layout";

      if (is_index) {
        path_type = "index";
      } else if (segments[segments.length - 1].segmentType === "splat") {
        path_type = "non-ultimate-splat";
      } else if (segments[segments.length - 1].segmentType === "dynamic") {
        path_type = "dynamic-layout";
      }

      paths.push({
        importPath: smart_normalize(path.join("pages/", _path + ".js")),
        path: path_to_use,
        segments: segments.map((x) => x.segment || null),
        pathType: path_type,
        hasSiblingClientFile: has_sibling_client_file,
      });
    }

    fs.mkdirSync(path.resolve(`./public/dist/pages/`), { recursive: true });

    try {
      await esbuild.build({
        entryPoints: [import_path_with_orig_ext],
        bundle: true,
        outfile: path.resolve(
          `./${is_client_file ? "public/" : ""}dist/pages/` + _path + ".js",
        ),
        treeShaking: true,
        platform: is_client_file ? "browser" : "node",
        packages: is_client_file ? undefined : "external",
        format: "esm",
        minify: is_client_file,
      });
    } catch (e) {
      console.error(e);
    }
  }

  return paths;
}

async function write_paths_to_disk() {
  const paths = await walk_pages();

  fs.writeFileSync(
    path.join(process.cwd(), "dist", "paths.js"),
    `export const ${HWY_GLOBAL_KEYS.paths} = ${JSON.stringify(paths)}`,
  );
}

async function generate_file_hash(file_path: string): Promise<string> {
  const content = await fs.promises.readFile(file_path);
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  return hash.slice(0, 12); // Take the first 12 characters for brevity.
}

async function generate_public_file_map() {
  const src_path = path.resolve("./public");

  const file_map: { [original: string]: string } = {};
  const reverse_file_map: { [hashed: string]: string } = {};

  async function traverse(src_dir: string): Promise<void> {
    const entries = await fs.promises.readdir(src_dir, { withFileTypes: true });

    const tasks: Promise<void>[] = entries.map(async (entry) => {
      const src_entry = path.join(src_dir, entry.name);
      const relative_entry = path.join(
        "public",
        path.relative(src_path, src_entry),
      );

      if (entry.isDirectory()) {
        return traverse(src_entry);
      } else {
        const hash = await generate_file_hash(src_entry);
        const extname = path.extname(entry.name);
        const basename = path.basename(entry.name, extname);
        const hashed_filename = `${basename}.${hash}${extname}`;
        const hashed_relative_path = path.join(
          "public",
          path.relative(
            src_path,
            src_entry.replace(basename + extname, hashed_filename),
          ),
        );
        file_map[relative_entry] = hashed_relative_path;
        reverse_file_map[hashed_relative_path] = relative_entry;
      }
    });

    await Promise.all(tasks);
  }

  await traverse(src_path);

  const map_file_path = path.resolve("./dist/public-map.js");
  const reverse_map_file_path = path.resolve("./dist/public-reverse-map.js");

  await Promise.all([
    fs.promises.writeFile(
      map_file_path,
      `export const ${HWY_GLOBAL_KEYS.public_map} = ${JSON.stringify(
        file_map,
      )};`,
      "utf-8",
    ),
    fs.promises.writeFile(
      reverse_map_file_path,
      `export const ${HWY_GLOBAL_KEYS.public_reverse_map} = ${JSON.stringify(
        reverse_file_map,
      )};`,
      "utf-8",
    ),
  ]);
}

export { generate_file_hash, write_paths_to_disk, generate_public_file_map };
export type Paths = Awaited<ReturnType<typeof walk_pages>>;
