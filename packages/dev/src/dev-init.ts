import type { Hono } from "hono";
import {
  LIVE_REFRESH_RPC_PATH,
  LIVE_REFRESH_SSE_PATH,
  get_hwy_global,
  hwyLog,
  type RefreshFilePayload,
} from "../../common/index.mjs";
import { sinks } from "./constants.js";
import { refreshMiddleware } from "./refresh-middleware.js";

function send_signal_to_sinks(payload: Omit<RefreshFilePayload, "at">) {
  if (payload.changeType === "standard") {
    hwyLog("Doing a full browser reload...");
  }

  for (const sink of sinks) {
    sink.send_message(JSON.stringify(payload));
  }
}

function setupLiveRefreshEndpoints({ app }: { app: Hono<any> }) {
  app.use(LIVE_REFRESH_SSE_PATH, refreshMiddleware());

  app.all(LIVE_REFRESH_RPC_PATH, async (c) => {
    const payload = (await c.req.json()) as Omit<RefreshFilePayload, "at">;

    send_signal_to_sinks(payload);

    if (payload.changeType === "standard") {
      for (const sink of sinks) {
        sink.close();
      }
    }

    if (payload.changeType === "critical-css" && payload.criticalCss) {
      const hwy_global = get_hwy_global();
      hwy_global.set("critical_bundled_css", payload.criticalCss);
    }

    return c.text("you called chokidar rpc");
  });
}

export { setupLiveRefreshEndpoints };
