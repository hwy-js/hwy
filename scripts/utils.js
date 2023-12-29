import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const dirs_in_slash_packages = [
  "core",
  "build",
  "dev",
  "create-hwy",
  "client",
  "utils",
];

function get_current_pkg_jsons() {
  return dirs_in_slash_packages.map((pkg_dirname) => {
    return JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "packages", pkg_dirname, "package.json"),
        "utf-8",
      ),
    );
  });
}

function save_new_pkg_jsons(new_version) {
  const pkg_jsons = get_current_pkg_jsons();

  const current_version = confirm_and_get_current_version();

  const new_pkg_jsons_stringified = pkg_jsons.map((pkg_json) => {
    return (
      JSON.stringify(pkg_json, null, 2).replace(
        `"version": "${current_version}"`,
        `"version": "${new_version}"`,
      ) + "\n"
    );
  });

  dirs_in_slash_packages.forEach((pkg_dirname, i) => {
    fs.writeFileSync(
      path.join(process.cwd(), "packages", pkg_dirname, "package.json"),
      new_pkg_jsons_stringified[i],
      "utf-8",
    );
  });

  console.log(
    `\nSaved new package versions.\n\n❌ Old versions: ${current_version}.\n\n✅ New versions: ${new_version}.\n`,
  );
}

function confirm_and_get_current_version(should_log = false) {
  const pkg_jsons = get_current_pkg_jsons();

  const versions = pkg_jsons.map((pkg_json) => pkg_json.version);

  if (versions.some((v) => v !== versions[0])) {
    throw new Error("Package versions are not all the same.");
  }

  if (should_log) {
    console.log(`Current version is ${versions[0]}.\n`);
  }

  return versions[0];
}

function bump_to_new_patch() {
  const current_version = confirm_and_get_current_version();

  const [major, minor, patch] = current_version.split(".").map(Number);

  const new_version = `${major}.${minor}.${patch + 1}`;

  save_new_pkg_jsons(new_version);
}

function bump_to_new_minor() {
  const current_version = confirm_and_get_current_version();

  const [major, minor] = current_version.split(".").map(Number);

  const new_version = `${major}.${minor + 1}.0`;

  save_new_pkg_jsons(new_version);
}

function bump_to_new_major() {
  const current_version = confirm_and_get_current_version();

  const [major] = current_version.split(".").map(Number);

  const new_version = `${major + 1}.0.0`;

  save_new_pkg_jsons(new_version);
}

function throw_if_already_beta() {
  const current_version = confirm_and_get_current_version();

  if (current_version.includes("-")) {
    throw new Error("Current version already has a beta suffix.");
  }
}

function add_beta() {
  throw_if_already_beta();

  const current_version = confirm_and_get_current_version();

  const [major, minor, patch] = current_version.split(".").map(Number);

  const new_version = `${major}.${minor}.${patch}-beta.0`;

  save_new_pkg_jsons(new_version);
}

function throw_if_not_beta() {
  const current_version = confirm_and_get_current_version();

  if (!current_version.includes("-")) {
    throw new Error("Current version does not have a beta suffix.");
  }
}

function bump_beta() {
  throw_if_not_beta();

  const current_version = confirm_and_get_current_version();

  const [major, minor, patch, beta] = current_version
    .split(".")
    .map((v) => (v.includes("-") ? v.split("-")[0] : v))
    .map(Number);

  const new_version = `${major}.${minor}.${patch}-beta.${beta + 1}`;

  save_new_pkg_jsons(new_version);
}

function remove_beta() {
  throw_if_not_beta();

  const current_version = confirm_and_get_current_version();

  const [major, minor, patch] = current_version
    .split(".")
    .map((v) => (v.includes("-") ? v.split("-")[0] : v));

  const new_version = `${major}.${minor}.${patch}`;

  save_new_pkg_jsons(new_version);
}

function set_version() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  confirm_and_get_current_version(true);

  new Promise((resolve) => {
    rl.question(`Enter new version: `, (answer) => {
      resolve(answer);
      rl.close();
    });
  }).then((new_version) => {
    save_new_pkg_jsons(new_version);
  });
}

export {
  add_beta,
  bump_beta,
  bump_to_new_major,
  bump_to_new_minor,
  bump_to_new_patch,
  confirm_and_get_current_version,
  remove_beta,
  set_version,
};
