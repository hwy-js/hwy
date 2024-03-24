import { createApp, eventHandler, toNodeListener } from "h3";
import {
  ClientScripts,
  CssImports,
  DevLiveRefreshScript,
  HeadElements,
  RootOutlet,
  hwyInit,
  renderRoot,
} from "hwy";
import { AddressInfo } from "net";
import { createServer } from "node:http";
import { RootLayout } from "./pages/layout.js";

declare module "hwy" {
  interface AdHocData {}
}
declare module "h3" {
  interface H3EventContext {}
}

const { app } = await hwyInit({
  app: createApp(),
  importMetaUrl: import.meta.url,
});

app.use(
  "*",
  eventHandler(async (event) => {
    return await renderRoot({
      event,
      defaultHeadBlocks: [
        { title: "hwy-example-minimal-mpa" },
        {
          tag: "meta",
          attributes: {
            name: "description",
            content: "Take the Hwy!",
          },
        },
      ],
      adHocData: { test2: "bob" },
      root: (routeData) => {
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
              <div id="root">
                <RootOutlet
                  {...routeData}
                  fallbackErrorBoundary={() => <div>Something went wrong.</div>}
                  layout={RootLayout}
                />
              </div>
            </body>
          </html>
        );
      },
    });
  }),
);

const server = createServer(toNodeListener(app)).listen(
  process.env.PORT || 3000,
);

const addrInfo = server.address() as AddressInfo;

console.log(`Listening on http://localhost:${addrInfo.port}`);
