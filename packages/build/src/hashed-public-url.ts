import path from "node:path";

export function getHashedPublicURLLowLevel({
  publicMap,
  url,
}: {
  publicMap: Record<string, string>;
  url: string;
}): string {
  let hashedURL: string | undefined;
  if (url.startsWith("/")) {
    url = url.slice(1);
  }
  if (url.startsWith("./")) {
    url = url.slice(2);
  }
  hashedURL = publicMap?.[path.join("public", url)];
  if (!hashedURL) {
    throw new Error(`No hashed URL found for ${url}`);
  }
  return "/" + hashedURL;
}
