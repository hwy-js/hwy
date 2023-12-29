import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readdirp from "readdirp";
import {
  HWY_GLOBAL_KEYS,
  Path,
  PathType,
  SPLAT_SEGMENT,
} from "../../common/index.mjs";
import { get_hwy_config } from "./get-hwy-config.js";
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

const hwy_config = await get_hwy_config();

const IS_PREACT_MPA = Boolean(hwy_config.useClientSidePreact);

console.log(hwy_config);

type FilesList = Array<{
  _path: string;
  import_path_with_orig_ext: string;
}>;

async function walk_pages(IS_DEV?: boolean): Promise<{
  paths: Array<Path>;
  page_files_list: FilesList;
  client_files_list: FilesList;
  server_files_list: FilesList;
}> {
  let page_files_list: FilesList = [];
  let client_files_list: FilesList = [];
  let server_files_list: FilesList = [];

  const paths: Paths = [];

  for await (const entry of readdirp(path.resolve("./src/pages"))) {
    const is_page_file = entry.path.includes(".page.");
    const is_client_file = entry.path.includes(".client.");
    const is_server_file = Boolean(
      hwy_config.useDotServerFiles && entry.path.includes(".server."),
    );

    if (!is_page_file && !is_client_file && !is_server_file) {
      continue;
    }

    const ext = entry.path.split(".").pop();

    if (!ext || !permitted_extensions.includes(ext)) {
      continue;
    }

    const pre_ext_delineator = is_page_file
      ? ".page"
      : is_server_file
        ? ".server"
        : ".client";

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

    if (is_page_file || is_server_file) {
      let has_sibling_page_file = false;
      let has_sibling_client_file = false;
      let has_sibling_server_file = false;

      for (const sibling of await fs.promises.readdir(
        path.dirname(import_path_with_orig_ext),
      )) {
        const filename = path.basename(_path);

        if (sibling.includes(filename + ".client.")) {
          has_sibling_client_file = true;
        }

        if (
          is_page_file &&
          hwy_config.useDotServerFiles &&
          sibling.includes(filename + ".server.")
        ) {
          has_sibling_server_file = true;

          break;
        }

        if (
          is_server_file &&
          hwy_config.useDotServerFiles &&
          sibling.includes(filename + ".page.")
        ) {
          has_sibling_page_file = true;

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

      if (is_server_file && !has_sibling_page_file) {
        paths.push({
          importPath: smart_normalize("pages/" + _path + ".server.js"),
          path: path_to_use,
          segments: segments.map((x) => x.segment || null),
          pathType: path_type,
          hasSiblingClientFile: has_sibling_client_file,
          hasSiblingServerFile: false,
          isServerFile: true,
        });
      }

      if (is_page_file) {
        paths.push({
          importPath: smart_normalize("pages/" + _path + ".page.js"),
          path: path_to_use,
          segments: segments.map((x) => x.segment || null),
          pathType: path_type,
          hasSiblingClientFile: has_sibling_client_file,
          hasSiblingServerFile: has_sibling_server_file,
          isServerFile: false,
        });
      }
    }

    await fs.promises.mkdir(path.resolve(`./public/dist/`), {
      recursive: true,
    });

    try {
      if (is_server_file) {
        server_files_list.push({ _path, import_path_with_orig_ext });
      }

      if (is_page_file) {
        page_files_list.push({ _path, import_path_with_orig_ext });
      }

      if (is_client_file) {
        client_files_list.push({ _path, import_path_with_orig_ext });
      }
    } catch (e) {
      console.error(e);
    }
  }

  return {
    paths,
    page_files_list,
    client_files_list,
    server_files_list,
  };
}

async function write_paths_to_disk(IS_DEV?: boolean) {
  const { paths, page_files_list, client_files_list, server_files_list } =
    await walk_pages(IS_DEV);

  await fs.promises.writeFile(
    path.join(process.cwd(), "dist", "paths.js"),
    `export const ${HWY_GLOBAL_KEYS.paths} = ${JSON.stringify(paths)}`,
  );

  return { page_files_list, client_files_list, server_files_list };
}

function sha1_short(content: crypto.BinaryLike) {
  return crypto.createHash("sha1").update(content).digest("hex").slice(0, 20);
}

async function generate_file_hash(file_path: string): Promise<string> {
  const content = await fs.promises.readFile(file_path);
  return sha1_short(content);
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
        const hashed_filename = `${hash}${extname}`;
        const hashed_relative_path = path.join(
          "public",
          path.relative(
            src_path,
            src_entry.replace(entry.name, hashed_filename),
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

export { generate_public_file_map, sha1_short, write_paths_to_disk };
export type Paths = Awaited<ReturnType<typeof walk_pages>>["paths"];
