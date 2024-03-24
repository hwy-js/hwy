import {
  App,
  createRouter,
  defineEventHandler,
  eventHandler,
  getRequestURL,
  sendRedirect,
  serveStatic,
  setResponseHeader,
  setResponseStatus,
} from "h3";
import type { readFile, stat } from "node:fs/promises";
import { getHwyGlobal } from "../../common/index.mjs";
import { getMimeType } from "./get-mimes.js";
import { getOrigPublicURL, getPublicUrl } from "./utils/hashed-public-url.js";
import {
  dynamicFileURLToPath,
  dynamicNodePath,
} from "./utils/url-polyfills.js";

let dynamicReadFile: typeof readFile;
let dynamicStat: typeof stat;

const isServer = typeof document === "undefined";

try {
  if (isServer) {
    const { readFile, stat } = await import("node:fs/promises");
    dynamicReadFile = readFile;
    dynamicStat = stat;
  }
} catch {}

function dirnameFromImportMeta(importMetaURL: string) {
  return dynamicNodePath?.dirname(dynamicFileURLToPath(importMetaURL)) ?? "";
}

// although instantiated with let, this should only ever be set once inside hwyInit
let ROOT_DIRNAME = "";
let PUBLIC_URL_PREFIX = "";

const IMMUTABLE_CACHE_HEADER_VALUE = "public, max-age=31536000, immutable";

const hwyGlobal = getHwyGlobal();

async function hwyInit({
  app,
  importMetaUrl,
}: {
  app: App;
  importMetaUrl?: string;
}) {
  console.log("Initializing Hwy app");

  if (hwyGlobal.get("isDev")) {
    const { setupLiveRefreshEndpoints } = await import("@hwy-js/dev");
    setupLiveRefreshEndpoints({ app });
  }

  ROOT_DIRNAME = dirnameFromImportMeta(importMetaUrl ?? "");

  const router = createRouter();
  app.use(router);

  router.use(
    "/favicon.ico",
    eventHandler(async (event) => {
      const publicUrl = getPublicUrl("favicon.ico");
      if (publicUrl) {
        return sendRedirect(event, getPublicUrl("favicon.ico"));
      }
      setResponseStatus(event, 404);
      return "Not found";
    }),
  );

  router.use(
    "/public/**",
    defineEventHandler((event) => {
      setResponseHeader(event, "Cache-Control", IMMUTABLE_CACHE_HEADER_VALUE);
      if (hwyGlobal.get("isDev")) {
        if (event.path.includes("public/dist/standard-bundled.css")) {
          setResponseHeader(event, "Cache-Control", "no-cache");
        }
      }
      return serveStatic(event, {
        indexNames: [],
        getContents: (url) => {
          const pathname = getRequestURL(event).pathname;
          const mime = getMimeType(pathname);
          if (mime) {
            setResponseHeader(event, "Content-Type", mime);
          }
          return dynamicReadFile(
            getOrigPublicURL({
              hashedURL: url,
            }),
          );
        },
        getMeta: async (url) => {
          const mime = getMimeType(url);
          if (mime) {
            setResponseHeader(event, "Content-Type", mime);
          }
          const stats = await dynamicStat(
            getOrigPublicURL({
              hashedURL: url,
            }),
          ).catch();
          if (!stats || !stats.isFile()) {
            return;
          }
          return {
            size: stats.size,
            mtime: stats.mtimeMs,
          };
        },
      });
    }),
  );

  return { app, router };
}

export {
  PUBLIC_URL_PREFIX,
  // private
  ROOT_DIRNAME,
  // public
  hwyInit,
};
