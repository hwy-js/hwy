---
title: "From Scratch"
---

```sh
#########################################################################
### Create a new directory and navigate into it
#########################################################################
mkdir your-project-name
cd your-project-name

#########################################################################
### Create a tsconfig.json file
#########################################################################
echo '{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "types": ["node"]
  },
  "exclude": ["node_modules", "dist"]
}' > tsconfig.json

#########################################################################
### Create a package.json file
#########################################################################
echo '{
  "name": "your-project-name",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc && hwy-build",
    "start": "node dist/main.js",
    "dev": "hwy-dev-serve"
  }
}' > package.json

#########################################################################
### Install the necessary packages
#########################################################################
npm i h3 hwy preact-render-to-string
npm i -D @hwy-js/build @hwy-js/dev @types/node preact typescript

#########################################################################
### Create a hwy.config.ts file
#########################################################################
echo 'import type { HwyConfig } from "@hwy-js/build";\n
export default {
  dev: { port: 9824 },
} satisfies HwyConfig;' > hwy.config.ts

#########################################################################
### Create a .gitignore file
#########################################################################
echo '# standard exclusions
node_modules\n
# build artifacts
dist
public/dist\n
# environment files
.env
.env.*
!env.example' > .gitignore

#########################################################################
### Create a src directory & main.tsx file
#########################################################################
mkdir src && echo 'import { createApp, eventHandler, toNodeListener } from "h3";
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
        { title: "your-project-name" },
        {
          tag: "meta",
          attributes: {
            name: "description",
            content: "your-project-description",
          },
        },
      ],
      root: (routeData) => {
        return (
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
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
  process.env.PORT || 3000,
);

const addrInfo = server.address() as AddressInfo;

console.log(`Listening on http://localhost:${addrInfo.port}`);' > src/main.tsx

#########################################################################
### Create a pages directory & _index.page.tsx file
#########################################################################
mkdir src/pages && echo 'export default function () {
  return <p>This is the home page.</p>;
}' > src/pages/_index.page.tsx
```
