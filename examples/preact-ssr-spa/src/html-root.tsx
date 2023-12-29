import { utils } from "hwy";
import { PreactApp } from "./preact-app.js";
import type { Context } from "hono";
import { renderToString } from "preact-render-to-string";

/* This file runs on the server only */

function renderHtmlRoot(c: Context) {
  const criticalCss = utils.getCriticalCss();
  const refreshScript = utils.getRefreshScript();

  const html = (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />

        <title>Hwy Preact SSR SPA</title>

        {criticalCss && (
          <style
            id={utils.getCriticalCssElementId()}
            dangerouslySetInnerHTML={{ __html: criticalCss }}
          />
        )}

        <link rel="stylesheet" href={utils.getBundledCssUrl()} />

        <script type="module" src={utils.getClientEntryUrl()} />

        {refreshScript && (
          <script
            type="module"
            dangerouslySetInnerHTML={{ __html: refreshScript }}
          />
        )}
      </head>

      <body>
        <PreactApp path={c.req.path} />
      </body>
    </html>
  );

  return "<!DOCTYPE html>" + renderToString(html);
}

export { renderHtmlRoot };
