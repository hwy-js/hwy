import { DEFAULT_PORT } from "../../common/index.mjs";
import type { Options } from "../index.js";
import { get_is_target_deno } from "./utils.js";

let imports = `
import {
  hwyInit,
  CssImports,
  RootOutlet,
  DevLiveRefreshScript,
  ClientScripts,
  HeadElements,
  getDefaultBodyProps,
  renderRoot,
} from "hwy";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
`.trim();

const node_imports = `
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
`.trim();

const deno_imports = `
import { serveStatic } from "hono/deno";
`.trim();

const bun_imports = `
import { serveStatic } from "hono/bun";
`.trim();

function get_main(options: Options) {
  const is_targeting_deno = get_is_target_deno(options);

  imports +=
    "\n" +
    (is_targeting_deno
      ? deno_imports
      : options.deployment_target === "bun"
        ? bun_imports
        : options.deployment_target === "cloudflare-pages"
          ? ""
          : node_imports);

  if (options.deployment_target === "vercel-lambda") {
    imports =
      imports + "\n" + `import { handle } from "@hono/node-server/vercel";`;
  }

  if (options.css_preference === "css-hooks") {
    imports =
      imports +
      "\n" +
      `import { hooks, CssHooksStyleSheet } from "./setup/css-hooks.js";`;
  }

  const arg_to_get_default_body_props = options.with_nprogress
    ? "{ idiomorph: true, nProgress: true }"
    : "{ idiomorph: true }";

  return (
    imports.trim() +
    "\n\n" +
    (options.deployment_target === "node" ||
    options.deployment_target === "vercel-lambda"
      ? `const IS_DEV = process.env.NODE_ENV === "development";\n\n`
      : "") +
    `
const app = new Hono();

${
  options.deployment_target === "cloudflare-pages"
    ? `await hwyInit({ app });`
    : `await hwyInit({
  app,
  importMetaUrl: import.meta.url,
  serveStatic,
});`
}

app.use("*", logger());
app.get("*", secureHeaders());

app.all("*", async (c, next) => {
  return await renderRoot({
    c,
    next,
    root: async ({ activePathData }) => {
      return (
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
  
            <HeadElements
              c={c}
              activePathData={activePathData}
              defaults={[
                { title: "${options.project_name}" },
                {
                  tag: "meta",
                  props: {
                    name: "description",
                    content: "Take the Hwy!",
                  },
                },
                {
                  tag: "meta",
                  props: {
                    name: "htmx-config",
                    content: JSON.stringify({
                      selfRequestsOnly: true,
                      refreshOnHistoryMiss: true,
                      scrollBehavior: "auto",
                    }),
                  },
                },
              ]}
            />
  
            <CssImports />
            <ClientScripts activePathData={activePathData} />
            <DevLiveRefreshScript />${
              options.css_preference === "css-hooks"
                ? "\n" +
                  add_prefix_spaces_to_each_line({
                    str: `<CssHooksStyleSheet />`,
                    number_of_spaces: 10,
                  })
                : ""
            }
          </head>
  
          ${
            options.css_preference === "css-hooks"
              ? add_prefix_spaces_to_each_line({
                  str: `<body
                {...getDefaultBodyProps(${arg_to_get_default_body_props})}
                style={hooks({
                  background: "orange",
                  dark: {
                    background: "black",
                  },
                })}
              >`,
                  number_of_spaces: 8,
                })
              : add_prefix_spaces_to_each_line({
                  str: `<body {...getDefaultBodyProps(${arg_to_get_default_body_props})}>`,
                  number_of_spaces: 8,
                })
          }
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
                c={c}
                activePathData={activePathData}
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

${
  options.deployment_target === "vercel-lambda"
    ? serve_fn_vercel
    : is_targeting_deno
      ? serve_fn_deno
      : options.deployment_target === "bun"
        ? serve_fn_bun
        : options.deployment_target === "cloudflare-pages"
          ? serve_fn_cloudflare_pages
          : serve_fn_node
}
`.trim() +
    "\n"
  );
}

export { get_main };

const serve_fn_cloudflare_pages = `
export default app;
`.trim();

const serve_fn_deno = `
const PORT = Deno.env.get("PORT") ? Number(Deno.env.get("PORT")) : ${DEFAULT_PORT};

Deno.serve({ port: PORT }, app.fetch);
`.trim();

const serve_fn_node = `
serve(
  { fetch: app.fetch, port: Number(process.env.PORT || ${DEFAULT_PORT}) },
  (info) => {
    console.log(
      \`\\nListening on http://\${IS_DEV ? "localhost" : info.address}:\${
        info.port
      }\\n\`,
    );
  },
);
`.trim();

const serve_fn_vercel = `
if (IS_DEV) {
  serve(
    { fetch: app.fetch, port: Number(process.env.PORT || ${DEFAULT_PORT}) },
    (info) => {
      console.log(
        \`\\nListening on http://\${IS_DEV ? "localhost" : info.address}:\${
          info.port
        }\\n\`,
      );
    },
  );
}


export default handle(app);
`.trim();

const serve_fn_bun = `
const PORT = process.env.PORT ? Number(process.env.PORT) : ${DEFAULT_PORT};

const server = Bun.serve({
  port: PORT,
  fetch: app.fetch,
});

console.log(\`\\nListening on http://\${server.hostname}:\${PORT}\\n\`);
`.trim();

function add_prefix_spaces_to_each_line({
  str,
  number_of_spaces,
}: {
  str: string;
  number_of_spaces: number;
}) {
  return str
    .split("\n")
    .map((line) => " ".repeat(number_of_spaces) + line)
    .join("\n");
}
