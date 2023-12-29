import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { RootOutlet } from "@hwy-js/client";
import { Hono } from "hono";
import {
  ClientScripts,
  CssImports,
  DevLiveRefreshScript,
  HeadElements,
  hwyInit,
  renderRoot,
} from "hwy";
import { Sidebar } from "./components/sidebar.js";

const { app } = await hwyInit({
  app: new Hono(),
  importMetaUrl: import.meta.url,
  serveStatic,
});

app.all("*", async (c, next) => {
  return await renderRoot({
    c,
    next,
    defaultHeadBlocks: [],
    root: function (routeData) {
      return (
        <html lang="en">
          <head>
            <meta charSet="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width,initial-scale=1"
            />

            <HeadElements {...routeData} />
            <CssImports />
            <ClientScripts {...routeData} />
            <DevLiveRefreshScript />
          </head>

          <body>
            <Sidebar />
            <main>
              <RootOutlet
                {...routeData}
                fallbackErrorBoundary={function ErrorBoundary() {
                  return <div>Error Boundary in Root</div>;
                }}
              />
            </main>
          </body>
        </html>
      );
    },
  });
});

app.notFound((c) => c.text("404 Not Found", 404));

const PORT = process.env.PORT ? Number(process.env.PORT) : 9999;

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(
    `\nListening on http://${
      process.env.NODE_ENV === "development" ? "localhost" : info.address
    }:${info.port}\n`,
  );
});
