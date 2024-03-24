import { createApp, defineEventHandler, toNodeListener } from "h3";
import {
  ClientScripts,
  CssImports,
  DevLiveRefreshScript,
  HeadElements,
  RootOutlet,
  hwyInit,
  renderRoot,
} from "hwy";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { Sidebar } from "./components/sidebar.js";

const { app } = await hwyInit({
  app: createApp(),
  importMetaUrl: import.meta.url,
});

app.use(
  "*",
  defineEventHandler(async (event) => {
    return await renderRoot({
      event,
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
  }),
);

const PORT = process.env.PORT ? Number(process.env.PORT) : 9999;
const server = createServer(toNodeListener(app)).listen(PORT);
const addrInfo = server.address() as AddressInfo;
console.log(`Listening on http://${addrInfo.address}:${addrInfo.port}`);
