# Using Bun

Assuming you are starting with a Node.js-based project, you can convert it to use Bun with the following steps.

## Step 1

Run the following:

```sh
npm remove @types/node
npm i -D bun-types
```

## Step 2

In your `tsconfig.json` file, change `"types": ["node"]` to `"types": ["bun-types"]`.

## Step 3

In your `package.json` file, change your `start` and `dev` scripts to the following:

```jsonc
{
  "scripts": {
    "start": "bun dist/main.js",
    "dev": "bun run --bun hwy-dev-serve",
  },
}
```

## Step 4

In your `main.tsx` file, convert the Node server code to the following:

```tsx
import { toWebHandler } from "h3";

const webHandler = toWebHandler(app);

const server = Bun.serve({
  port: process.env.PORT || 3000,
  fetch(request: Request) {
    return webHandler(request);
  },
});

console.log(`Listening on http://${server.hostname}:${server.port}`);
```

That's it!
