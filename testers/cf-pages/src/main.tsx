import { RootOutlet } from "@hwy-js/client";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { HeadElements, hwyInit, renderRoot } from "hwy";

const app = new Hono();

await hwyInit({ app });

app.use("*", logger());
app.get("*", secureHeaders());

const defaultHeadBlocks = [
  { title: "cf-pages-tester" },
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

app.all("*", async (c, next) => {
  return await renderRoot({
    c,
    next,
    defaultHeadBlocks,
    root: (baseProps) => {
      return (
        <html lang="en">
          <head>
            <HeadElements {...baseProps} />
          </head>

          <body>
            <nav>
              <a href="/">
                <h1>Hwy</h1>
              </a>

              <ul>
                <li>
                  <a href="/about">About</a>
                </li>
                <li>
                  <a href="/login">Login</a>
                </li>
              </ul>
            </nav>

            <main>
              <RootOutlet
                {...baseProps}
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
});

app.notFound((c) => c.text("404 Not Found", 404));

app.onError((error, c) => {
  console.error(error);
  return c.text("500 Internal Server Error", 500);
});

export default app;
