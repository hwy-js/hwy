let fileURLToPath: (url: string | URL) => string;
let pathToFileURL: (path: string) => URL;

const isServer = typeof document === "undefined";

try {
  if (isServer) {
    const nodeURL = await import("node:url");
    fileURLToPath = nodeURL.fileURLToPath;
    pathToFileURL = nodeURL.pathToFileURL;
  }
} catch {}

function dynamicFileURLToPath(url: string | URL | undefined): string {
  if (!url) {
    return "";
  }

  if (!fileURLToPath) {
    return typeof url === "string" ? url : url.href;
  }

  return fileURLToPath(url);
}

function pathToFileURLStr(path: string | undefined): string {
  if (!path) {
    return "";
  }

  if (!pathToFileURL) {
    return path || "";
  }

  return pathToFileURL(path).href;
}

let dynamicNodePath: typeof import("node:path") | undefined;

try {
  if (isServer) {
    dynamicNodePath = await import("node:path");
  }
} catch {}

export { dynamicFileURLToPath, dynamicNodePath, pathToFileURLStr };
