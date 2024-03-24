import chokidar from "chokidar";
import dotenv from "dotenv";
import { getPort } from "get-port-please";
import { ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { hwyLog } from "../../common/dev.mjs";
import {
  LIVE_REFRESH_RPC_PATH,
  RefreshFilePayload,
} from "../../common/index.mjs";
import { getHwyConfig } from "./get-hwy-config.js";
import { runBuildTasks } from "./run-build-tasks.js";

const hwyConfig = await getHwyConfig();
let devConfig = hwyConfig.dev;

function getIsHotReloadOnly(
  changeType: RefreshFilePayload["changeType"] | undefined,
): changeType is "css-bundle" | "critical-css" {
  return Boolean(
    hwyConfig.dev?.hotReloadStyles && changeType && changeType !== "standard",
  );
}

async function devServe() {
  let hasRunOneTime = false;

  hwyLog.info("running in dev mode");

  dotenv.config();

  const env = {
    NODE_ENV: "development",
    ...process.env,
  };

  if (typeof process.env.PORT === "undefined") {
    const port = String(await getPort());
    process.env.PORT = port;
    (env as any).PORT = port;
  }

  const refreshWatcher = chokidar.watch(
    path.join(process.cwd(), "dist", "refresh.txt"),
    { ignoreInitial: true },
  );

  refreshWatcher.on("all", async () => {
    const refreshTxtPath = path.join(process.cwd(), "dist", "refresh.txt");

    if (!fs.existsSync(refreshTxtPath)) {
      return;
    }

    const refreshObj = JSON.parse(
      fs.readFileSync(refreshTxtPath, "utf8"),
    ) as RefreshFilePayload;

    if (hasRunOneTime) {
      try {
        await fetch(
          `http://127.0.0.1:${process.env.PORT}${LIVE_REFRESH_RPC_PATH}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(refreshObj),
          },
        );
      } catch (e) {
        console.error("Live refresh RPC failed:", e);
      }
    }

    hasRunOneTime = true;

    const hotReloadOnly = getIsHotReloadOnly(refreshObj.changeType);
    if (!hotReloadOnly) {
      runCmdWithSpawn().catch((error) => {
        console.error(error);
      });
    }
  });

  const exclusions =
    devConfig?.watchExclusions?.map((x) => path.join(process.cwd(), x)) || [];
  const inclusions =
    devConfig?.watchInclusions?.map((x) => path.join(process.cwd(), x)) || [];

  const watcher = chokidar.watch(
    [
      path.join(process.cwd(), "src"),
      path.join(process.cwd(), "public"),
      ...inclusions,
    ],
    {
      ignoreInitial: true,
      ignored: [path.join(process.cwd(), "public/dist"), ...exclusions],
    },
  );

  watcher.on("all", async (type, path) => {
    const isChange = type === "change";
    const normalizedPath = path.replace(/\\/g, "/");
    const isCSSChange =
      isChange &&
      normalizedPath.includes("/src/styles/") &&
      normalizedPath.endsWith(".css");
    const isCSSChangeToBundle =
      isCSSChange && normalizedPath.includes("/src/styles/normal/");
    const isCSSChangeToCritical =
      isCSSChange && normalizedPath.includes("/src/styles/critical/");

    hwyLog.info(
      isCSSChangeToBundle
        ? "hot reloading CSS bundle"
        : isCSSChangeToCritical
          ? "hot reloading critical CSS"
          : "change detected, restarting server",
    );

    try {
      await runBuildTasks({
        isDev: true,
        log: "triggered from chokidar watcher: " + path,
        changeType: isCSSChangeToCritical
          ? "critical-css"
          : isCSSChangeToBundle
            ? "css-bundle"
            : "standard",
      });
    } catch (e) {
      console.error("ERROR: Build tasks failed:", e);
    }
  });

  // Watch for changes to hwy.config.* files
  // And if found, warn user they need to restart the server
  const configWatcher = chokidar.watch(
    path.join(process.cwd(), "hwy.config.*"),
    { ignoreInitial: true },
  );
  configWatcher.on("all", () => {
    hwyLog.warning(
      "action needed: restart your dev server to apply config changes",
    );
  });

  // --- Node command runner ---

  let currentProc: ChildProcess | null = null;

  async function runCmdWithSpawn() {
    return new Promise<void>((resolve, reject) => {
      if (currentProc) {
        currentProc.kill();
      }

      const proc = spawn("node", ["dist/main.js"], {
        env,
        stdio: "inherit",
      });

      currentProc = proc;

      proc.on("exit", (code) => {
        if (currentProc === proc) {
          currentProc = null;
        }

        if (code === null) {
          // Process was forcefully terminated
          return;
        }

        if (code !== 0) {
          reject(new Error(`Process exited with code ${code}`));
        } else {
          resolve();
        }
      });

      proc.on("error", (error) => {
        if (currentProc === proc) {
          currentProc = null;
        }
        reject(error);
      });
    });
  }

  try {
    await runBuildTasks({ isDev: true, log: "triggered from dev-serve.js" });
  } catch (e) {
    console.error("ERROR: Build tasks failed:", e);
  }
}

export { devServe, getIsHotReloadOnly };
