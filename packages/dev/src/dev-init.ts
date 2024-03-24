import { App, createEventStream, eventHandler, readBody } from "h3";
import { hwyLog } from "../../common/dev.mjs";
import {
  LIVE_REFRESH_RPC_PATH,
  LIVE_REFRESH_SSE_PATH,
  getHwyGlobal,
  type RefreshFilePayload,
} from "../../common/index.mjs";

type ServerSentEventSink = {
  push(message: string): Promise<void>;
  close(): Promise<void>;
};

export const sinks = new Set<ServerSentEventSink>();

function setupLiveRefreshEndpoints({ app }: { app: App }) {
  app.use(
    LIVE_REFRESH_SSE_PATH,
    eventHandler(async function (event) {
      if (sinks.size > 5) {
        console.warn(
          "You have too many client SSE connections open. Please close some of your dev browser tabs. See https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#listening_for_custom_events for more info on why this is a problem.",
        );
      }
      const eventStream = createEventStream(event);
      const sink: ServerSentEventSink = {
        async push(message) {
          await eventStream.push(message);
        },
        async close() {
          sinks.delete(sink);
          await eventStream.close();
        },
      };
      sinks.add(sink);
      eventStream.onClosed(async () => {
        sink.close();
      });
      return eventStream.send();
    }),
  );

  app.use(
    LIVE_REFRESH_RPC_PATH,
    eventHandler(async (event) => {
      const payload = (await readBody(event)) as Omit<RefreshFilePayload, "at">;
      if (payload.changeType === "standard") {
        hwyLog.info("doing a full browser reload...");
      }
      for (const sink of sinks) {
        await sink.push(JSON.stringify(payload));
      }
      if (payload.changeType === "standard") {
        for (const sink of sinks) {
          await sink.close();
        }
      }
      if (payload.changeType === "critical-css" && payload.criticalCss) {
        const hwyGlobal = getHwyGlobal();
        hwyGlobal.set("criticalBundledCSS", payload.criticalCss);
      }
      return "you called chokidar rpc";
    }),
  );
}

export { setupLiveRefreshEndpoints };
