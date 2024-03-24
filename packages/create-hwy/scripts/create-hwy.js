#!/usr/bin/env node
import * as p from "@clack/prompts";
import { downloadTemplate } from "giget";
import fs from "node:fs";

const TARGET_REGISTRY = "github";
const TARGET_REPO = "hwy-js/hwy";
const TARGET_SUBDIR = "examples/minimal-mpa";
const TARGET_BRANCH = "h3-react";
const GIGET_TARGET = `${TARGET_REGISTRY}:${TARGET_REPO}/${TARGET_SUBDIR}#${TARGET_BRANCH}`;

function isSafeDirName(name) {
  const pattern = /^[a-zA-Z0-9_.-]+$/;
  return !!name && pattern.test(name);
}

function isNonExistentDir(name) {
  const exists = fs.existsSync(name);
  const isDir = exists && fs.lstatSync(name).isDirectory();
  return !exists || !isDir;
}

async function download(dir) {
  try {
    console.log("\nDownloading...");
    await downloadTemplate(GIGET_TARGET, { dir });

    p.note(`cd ${dir}\nnpm i\nnpm run dev`, "Success! Next steps:");
  } catch (e) {
    console.error(e);
  }
}

async function askForDirectoryName() {
  p.intro("\nWelcome to the Hwy project generator!");

  return await p.text({
    message: "Enter a new directory name for your project:",
    placeholder: "my-hwy-project",
    validate: (input) => {
      if (!isSafeDirName(input)) {
        return "Please use only letters, numbers, underscores, dashes, and periods.";
      }
      if (!isNonExistentDir(input)) {
        return "Directory already exists. Please choose a different name.";
      }
    },
  });
}

const dir = await askForDirectoryName();
if (typeof dir === "string" && !!dir) {
  await download(dir);
} else {
  p.cancel("No directory name provided. Exiting.");
  process.exit(1);
}
