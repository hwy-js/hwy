import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { hwyInit } from "hwy";
import { renderHtmlRoot } from "./html-root.js";

const app = new Hono();

await hwyInit({
  app,
  importMetaUrl: import.meta.url,
  serveStatic,
});

app.use("*", logger());
app.get("*", secureHeaders());

app.get("/*", async (c) => c.html(renderHtmlRoot(c)));

app.notFound((c) => c.text("404 Not Found", 404));

app.onError((error, c) => {
  console.error(error);
  return c.text("500 Internal Server Error", 500);
});

const PORT = Number(process.env.PORT ?? 3000);

const server = Bun.serve({
  port: PORT,
  fetch: app.fetch,
});

console.log(`\nListening on http://${server.hostname}:${PORT}\n`);
