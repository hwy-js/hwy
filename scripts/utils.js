import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const dirsInSlashPackages = [
  "core",
  "build",
  "dev",
  "client",
  "utils",
  "create-hwy",
];

function getCurrentPkgJSONs() {
  return dirsInSlashPackages.map((pkgDirname) => {
    return JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "packages", pkgDirname, "package.json"),
        "utf-8",
      ),
    );
  });
}

function saveNewPkgJSONs(newVersion) {
  const pkgJSONs = getCurrentPkgJSONs();

  const currentVersion = confirmAndGetCurrentVersion();

  const newPkgJSONsStringified = pkgJSONs.map((pkgJSON) => {
    return (
      JSON.stringify(pkgJSON, null, 2).replace(
        `"version": "${currentVersion}"`,
        `"version": "${newVersion}"`,
      ) + "\n"
    );
  });

  dirsInSlashPackages.forEach((pkgDirname, i) => {
    fs.writeFileSync(
      path.join(process.cwd(), "packages", pkgDirname, "package.json"),
      newPkgJSONsStringified[i],
      "utf-8",
    );
  });

  console.log(
    `\nSaved new package versions.\n\n❌ Old versions: ${currentVersion}.\n\n✅ New versions: ${newVersion}.\n`,
  );
}

function confirmAndGetCurrentVersion(shouldLog = false) {
  const pkgJSONs = getCurrentPkgJSONs();

  const versions = pkgJSONs.map((pkgJSON) => pkgJSON.version);

  if (versions.some((v) => v !== versions[0])) {
    throw new Error("Package versions are not all the same.");
  }

  if (shouldLog) {
    console.log(`Current version is ${versions[0]}.\n`);
  }

  return versions[0];
}

function bumpToNewPatch() {
  const currentVersion = confirmAndGetCurrentVersion();

  const [major, minor, patch] = currentVersion.split(".").map(Number);

  const newVersion = `${major}.${minor}.${patch + 1}`;

  saveNewPkgJSONs(newVersion);
}

function bumpToNewMinor() {
  const currentVersion = confirmAndGetCurrentVersion();

  const [major, minor] = currentVersion.split(".").map(Number);

  const newVersion = `${major}.${minor + 1}.0`;

  saveNewPkgJSONs(newVersion);
}

function bumpToNewMajor() {
  const currentVersion = confirmAndGetCurrentVersion();

  const [major] = currentVersion.split(".").map(Number);

  const newVersion = `${major + 1}.0.0`;

  saveNewPkgJSONs(newVersion);
}

function throwIfAlreadyBeta() {
  const currentVersion = confirmAndGetCurrentVersion();

  if (currentVersion.includes("-")) {
    throw new Error("Current version already has a beta suffix.");
  }
}

function addBeta() {
  throwIfAlreadyBeta();

  const currentVersion = confirmAndGetCurrentVersion();

  const [major, minor, patch] = currentVersion.split(".").map(Number);

  const newVersion = `${major}.${minor}.${patch}-beta.0`;

  saveNewPkgJSONs(newVersion);
}

function throwIfNotBeta() {
  const currentVersion = confirmAndGetCurrentVersion();

  if (!currentVersion.includes("-")) {
    throw new Error("Current version does not have a beta suffix.");
  }
}

function bumpBeta() {
  throwIfNotBeta();

  const currentVersion = confirmAndGetCurrentVersion();

  const [major, minor, patch, beta] = currentVersion
    .split(".")
    .map((v) => (v.includes("-") ? v.split("-")[0] : v))
    .map(Number);

  const newVersion = `${major}.${minor}.${patch}-beta.${beta + 1}`;

  saveNewPkgJSONs(newVersion);
}

function removeBeta() {
  throwIfNotBeta();

  const currentVersion = confirmAndGetCurrentVersion();

  const [major, minor, patch] = currentVersion
    .split(".")
    .map((v) => (v.includes("-") ? v.split("-")[0] : v));

  const newVersion = `${major}.${minor}.${patch}`;

  saveNewPkgJSONs(newVersion);
}

function setVersion() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  confirmAndGetCurrentVersion(true);

  new Promise((resolve) => {
    rl.question(`Enter new version: `, (answer) => {
      resolve(answer);
      rl.close();
    });
  }).then((newVersion) => {
    saveNewPkgJSONs(newVersion);
  });
}

export {
  addBeta,
  bumpBeta,
  bumpToNewMajor,
  bumpToNewMinor,
  bumpToNewPatch,
  confirmAndGetCurrentVersion,
  removeBeta,
  setVersion,
};
