import { RootOutlet } from "@hwy-js/client";
import { createApp, eventHandler, toNodeListener } from "h3";
import { createServer } from "http";
import {
  ClientScripts,
  CssImports,
  DevLiveRefreshScript,
  HeadElements,
  hwyInit,
  renderRoot,
} from "hwy";
import { AddressInfo } from "net";

const { app } = await hwyInit({
  app: createApp(),
  importMetaUrl: import.meta.url,
});

const defaultHeadBlocks = [
  { title: "bun-tester" },
  {
    tag: "meta",
    attributes: {
      charset: "UTF-8",
    },
  },
  {
    tag: "meta",
    attributes: {
      name: "viewport",
      content: "width=device-width,initial-scale=1",
    },
  },
  {
    tag: "meta",
    attributes: {
      name: "description",
      content: "Take the Hwy!",
    },
  },
];

app.use(
  "*",
  eventHandler(async (event) => {
    return await renderRoot({
      event,
      defaultHeadBlocks,
      root: (routeData) => {
        return (
          <html lang="en">
            <head>
              <HeadElements {...routeData} />
              <CssImports />
              <ClientScripts {...routeData} />
              <DevLiveRefreshScript />
            </head>

            <body>
              <nav>
                <a href="/" data-boost="true">
                  <h1>Hwy</h1>
                </a>

                <ul>
                  <li>
                    <a href="/about" data-boost="true">
                      About
                    </a>
                  </li>
                  <li>
                    <a href="/login" data-boost="true">
                      Login
                    </a>
                  </li>
                </ul>
              </nav>

              <main>
                <RootOutlet
                  {...routeData}
                  fallbackErrorBoundary={() => {
                    return <div>Something went wrong.</div>;
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

const server = createServer(toNodeListener(app)).listen(
  process.env.PORT || 3000,
);

const addrInfo = server.address() as AddressInfo;

console.log(`Listening on http://localhost:${addrInfo.port}`);