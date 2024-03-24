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
              <RootOutlet {...routeData} />
            </body>
          </html>
        );
      },
    });
  }),
);

const server = createServer(toNodeListener(app)).listen(
  process.env.PORT || 8976,
);

const addrInfo = server.address() as AddressInfo;

console.log(addrInfo);

console.log(`Listening on http://localhost:${addrInfo.port}`);
