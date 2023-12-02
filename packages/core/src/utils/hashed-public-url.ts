import path from "node:path";
import { PUBLIC_URL_PREFIX } from "../setup.js";
import { get_hwy_global } from "./get-hwy-global.js";

const hwy_global = get_hwy_global();

function get_dev_bundled_css_link() {
  const root = "/public/dist/standard-bundled.css?NOTE_TO_DEV=";
  const val_part_1 = "this-will-be-hashed-and-cached-in-production-";
  const val_part_2 = "just-like-your-client-entry-file";
  return root + val_part_1 + val_part_2;
}

export const DEV_BUNDLED_CSS_LINK = get_dev_bundled_css_link();

function getPublicUrl(url: string): string {
  let hashed_url: string | undefined;

  if (url.startsWith("/")) url = url.slice(1);
  if (url.startsWith("./")) url = url.slice(2);

  if (hwy_global.get("is_dev")) {
    const normalized_url = url.replace(/\\/g, "/");
    if (normalized_url === "dist/standard-bundled.css") {
      return DEV_BUNDLED_CSS_LINK;
    }
  }

  const public_map = hwy_global.get("public_map");

  hashed_url = public_map?.[path.join("public", url)];

  if (!hashed_url) {
    throw new Error(`No hashed URL found for ${url}`);
  }

  return "/" + hashed_url;
}

function get_original_public_url({
  hashed_url,
}: {
  hashed_url: string;
}): string {
  const sliced_url = path.normalize(hashed_url.slice(1));

  if (hwy_global.get("is_dev")) {
    const normalized_sliced_url = sliced_url.replace(/\\/g, "/");

    if (normalized_sliced_url.startsWith("public/dist/standard-bundled")) {
      return "./" + PUBLIC_URL_PREFIX + "public/dist/standard-bundled.css";
    }
  }

  const reverse_public_map = hwy_global.get("public_reverse_map");

  const original_url = reverse_public_map?.[sliced_url];

  if (!original_url) {
    throw new Error(`No original URL found for ${sliced_url}`);
  }

  return "./" + PUBLIC_URL_PREFIX + original_url;
}

function get_serve_static_options() {
  return {
    rewriteRequestPath: (path: string) => {
      return get_original_public_url({
        hashed_url: path,
      });
    },
  };
}

export { getPublicUrl, get_serve_static_options, get_original_public_url };
