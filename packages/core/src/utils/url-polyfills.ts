let fileURLToPath: (url: string | URL) => string;
let pathToFileURL: (path: string) => URL;

const IS_SERVER = typeof document === "undefined";

try {
  if (IS_SERVER) {
    const node_url = await import("node:url");
    fileURLToPath = node_url.fileURLToPath;
    pathToFileURL = node_url.pathToFileURL;
  }
} catch {}

function file_url_to_path(url: string | URL | undefined): string {
  if (!url) {
    return "";
  }

  if (!fileURLToPath) {
    return typeof url === "string" ? url : url.href;
  }

  return fileURLToPath(url);
}

function path_to_file_url_string(path: string | undefined): string {
  if (!path) {
    return "";
  }

  if (!pathToFileURL) {
    return path || "";
  }

  return pathToFileURL(path).href;
}

let node_path: typeof import("node:path") | undefined;

try {
  if (IS_SERVER) {
    node_path = await import("node:path");
  }
} catch {}

export { file_url_to_path, path_to_file_url_string, node_path };
