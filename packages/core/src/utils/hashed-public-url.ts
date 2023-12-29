import { get_hwy_global } from "../../../common/index.mjs";
import { PUBLIC_URL_PREFIX } from "../setup.js";
import { node_path } from "./url-polyfills.js";

const hwy_global = get_hwy_global();

export const DEV_BUNDLED_CSS_QUERY_PARAM =
  "?NOTE_TO_DEV=this-will-be-hashed-and-cached-in-prod-just-like-your-client-entry-file";

export const DEV_BUNDLED_CSS_LINK =
  "/public/dist/standard-bundled.css" + DEV_BUNDLED_CSS_QUERY_PARAM;

function getPublicUrl(url: string): string {
  let hashed_url: string | undefined;

  if (url.startsWith("/")) url = url.slice(1);
  if (url.startsWith("./")) url = url.slice(2);

  const public_map = hwy_global.get("public_map");

  if (!node_path) {
    throw new Error("node_path is not defined");
  }

  hashed_url = public_map?.[node_path.join("public", url)];

  if (!hashed_url) {
    const no_need_to_log_list = [
      "dist/standard-bundled.css",
      "dist/entry.client.js",
      "favicon.ico",
    ];
    if (!no_need_to_log_list.includes(url)) {
      console.log("No hashed URL found for", url);
    }
    return "";
  }

  if (hwy_global.get("is_dev")) {
    const normalized_url = url.replace(/\\/g, "/");
    if (normalized_url === "dist/standard-bundled.css") {
      return DEV_BUNDLED_CSS_LINK;
    }
  }

  return "/" + hashed_url;
}

function get_original_public_url({
  hashed_url,
}: {
  hashed_url: string;
}): string {
  if (!node_path) {
    throw new Error("node_path is not defined");
  }

  const sliced_url = node_path.normalize(hashed_url.slice(1));

  if (hwy_global.get("is_dev")) {
    const normalized_sliced_url = sliced_url.replace(/\\/g, "/");

    if (normalized_sliced_url.startsWith("public/dist/standard-bundled")) {
      return "./" + "public/dist/standard-bundled.css";
    }
  }

  if (
    sliced_url.includes("__hwy_chunk__") ||
    sliced_url === "public/dist/preact-compat/compat.module.js.map"
  ) {
    return "./" + PUBLIC_URL_PREFIX + sliced_url;
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

export { getPublicUrl, get_original_public_url, get_serve_static_options };
