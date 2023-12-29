import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { handle } from "@hono/node-server/vercel";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { HeadBlock, getRouteData, hwyInit, utils } from "hwy";
import { BodyInner } from "./components/body-inner.js";
import { IS_DEV } from "./utils/constants.js";
import { make_emoji_data_url } from "./utils/utils.js";

import { html } from "hono/html";
import { renderToString } from "preact-render-to-string";

const app = new Hono();
app.use("*", logger());
app.get("*", secureHeaders());

await hwyInit({
  app,
  importMetaUrl: import.meta.url,
  serveStatic,
  /*
   * The publicUrlPrefix makes the monorepo work with the public
   * folder when deployed with Vercel. If you aren't using a
   * monorepo (or aren't deploying to Vercel), you won't need
   * to add a publicUrlPrefix.
   */
  publicUrlPrefix: process.env.NODE_ENV === "production" ? "docs/" : undefined,
});

const defaultHeadBlocks: HeadBlock[] = [
  { title: "Hwy Framework" },
  {
    tag: "meta",
    attributes: {
      name: "description",
      content:
        "Hwy is a simple, lightweight, and flexible web framework, built on Hono and HTMX.",
    },
  },
  {
    tag: "link",
    attributes: {
      rel: "icon",
      href: make_emoji_data_url("⭐"),
    },
  },
  {
    tag: "meta",
    attributes: {
      name: "og:image",
      content: "/create-hwy-snippet.webp",
    },
  },
];

app.all("*", async (c, next) => {
  if (c.req.method === "GET") {
    c.header("Cache-Control", "max-age=0, s-maxage=2678400");
  }

  const routeData = await getRouteData({ c, defaultHeadBlocks });

  if (routeData instanceof Response) {
    return routeData;
  }

  if (!routeData) {
    return await next();
  }

  const {
    title,
    criticalInlinedCssProps,
    metaElementsProps,
    serverRenderingProps,
    injectedScriptsProps,
    clientEntryModuleProps,
    restHeadElementsProps,
    pageSiblingsProps,
    bundledStylesheetProps,
    devRefreshScriptProps,
    activePathData,
  } = routeData;

  async function hi() {
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
    return "bob";
  }

  const markup = (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />

        <title>{title}</title>

        <style {...criticalInlinedCssProps} />

        {metaElementsProps.map((props) => (
          <meta {...props} />
        ))}

        {/* {await hi()} */}

        <script {...serverRenderingProps} />

        {injectedScriptsProps.map((props) => (
          <script {...props} />
        ))}

        <script {...clientEntryModuleProps} />

        {restHeadElementsProps.map((props) => (
          /* @ts-ignore */
          <props.tag {...props.attributes} />
        ))}

        {pageSiblingsProps.map((props) => (
          <script {...props} />
        ))}

        <link {...bundledStylesheetProps} />
        <script {...devRefreshScriptProps} />

        <script defer src={utils.getPublicUrl("prism.js")} />
      </head>

      <body>
        <BodyInner activePathData={activePathData} />
      </body>
    </html>
  );

  // Hono
  // return c.html(html`<!doctype html>${markup}`);

  // Preact
  return c.html("<!doctype html>" + renderToString(markup));
});

app.notFound((c) => {
  return c.text("404 Not Found", 404);
});

app.onError((error, c) => {
  console.error(error);
  return c.text("500 Internal Server Error", 500);
});

export default handle(app);

serve({ fetch: app.fetch, port: Number(process.env.PORT || 3000) }, (info) => {
  console.log(
    `\nListening on http://${IS_DEV ? "localhost" : info.address}:${
      info.port
    }\n`,
  );
});
