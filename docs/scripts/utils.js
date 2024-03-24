import fs from "node:fs";

const currentLatestHwyCoreVersion = JSON.parse(
  fs.readFileSync("../packages/core/package.json"),
).version;

console.log(
  "Current latest hwy core version:",
  currentLatestHwyCoreVersion + "\n",
);

const overrideHwyVersion = undefined;
console.log("Override hwy version:", overrideHwyVersion + "\n");

const hwyVersion = overrideHwyVersion || currentLatestHwyCoreVersion;
console.log("Using hwy version:", hwyVersion + "\n");

const hwyPkgRegex = /"hwy": "([^"]+)"/;
const buildPkgRegex = /"@hwy-js\/build": "([^"]+)"/;
const clientPkgRegex = /"@hwy-js\/client": "([^"]+)"/;
const devPkgRegex = /"@hwy-js\/dev": "([^"]+)"/;

function replaceVersions(pkgJSONStr, version) {
  return pkgJSONStr
    .replace(hwyPkgRegex, `"hwy": "${version}"`)
    .replace(buildPkgRegex, `"@hwy-js/build": "${version}"`)
    .replace(clientPkgRegex, `"@hwy-js/client": "${version}"`)
    .replace(devPkgRegex, `"@hwy-js/dev": "${version}"`);
}

function toWorkspace() {
  let pkgJSONStr = fs.readFileSync("package.json", "utf-8");
  pkgJSONStr = replaceVersions(pkgJSONStr, "workspace:*");
  fs.writeFileSync("package.json", pkgJSONStr);
  console.log("Updated package.json to use workspace\n");
}

function toLatest() {
  let pkgJSONStr = fs.readFileSync("package.json", "utf-8");
  pkgJSONStr = replaceVersions(pkgJSONStr, hwyVersion);
  fs.writeFileSync("package.json", pkgJSONStr);
  console.log(`Updated package.json to use ${hwyVersion}\n`);
}

export { toLatest, toWorkspace };
