import {
  hwyInit,
  CssImports,
  RootOutlet,
  DevLiveRefreshScript,
  ClientScripts,
  HeadElements,
  HeadBlock,
  renderRoot,
  getDefaultBodyProps,
} from "hwy";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Sidebar } from "./components/sidebar.js";
import { hooks, CssHooksStyleSheet } from "./setup/css-hooks.js";

const app = new Hono();

const IS_DEV = process.env.NODE_ENV === "development";

await hwyInit({
  app,
  importMetaUrl: import.meta.url,
  serveStatic,
});

const default_head_blocks: HeadBlock[] = [
  { title: "Tester" },
  {
    tag: "meta",
    props: {
      name: "htmx-config",
      content: JSON.stringify({
        defaultSwapStyle: "outerHTML",
        selfRequestsOnly: true,
        refreshOnHistoryMiss: true,
      }),
    },
  },
];

app.all("*", async (c, next) => {
  return await renderRoot({
    c,
    next,
    root: ({ activePathData }) => {
      return (
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width,initial-scale=1"
            />

            <HeadElements
              activePathData={activePathData}
              c={c}
              defaults={default_head_blocks}
            />

            <CssImports />
            <ClientScripts activePathData={activePathData} />
            <DevLiveRefreshScript />
            <CssHooksStyleSheet />
          </head>

          <body
            {...getDefaultBodyProps({ idiomorph: true })}
            style={hooks({
              background: "orange",
              dark: {
                background: "black",
              },
            })}
          >
            <Sidebar />
            <main>
              <RootOutlet
                activePathData={activePathData}
                c={c}
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
    `\nListening on http://${IS_DEV ? "localhost" : info.address}:${
      info.port
    }\n`,
  );
});
