# 🛣️ Hwy

Hwy is a simple, lightweight, and flexible web framework.

## Quick Start

```bash
npx create-hwy@latest
```

## What is Hwy?

At its core, Hwy is a server-rendered, multi-page app ("MPA") framework for NodeJS. Hwy is built on top of <a href="https://h3.unjs.io" target="_blank">h3</a> (the core server framework behind Nuxt and SolidStart), <a href="https://esbuild.github.io" target="_blank">esbuild</a> (for TypeScript transpilation and bundling), and <a href="https://react.dev" target="_blank">React</a> (for rendering JSX on the server, and optionally on the client).

If you want to upgrade beyond an MPA pattern, Hwy has first-class support for both React and HTMX on the client. This means you can build a full-featured SPA with Hwy, or you can build a traditional MPA, or you can build something in between.

## Features

- Server-rendered JSX
- Nested, file-based routing
- Remix-style actions and parallel loaders
- 100% type-safe
- Server built on h3
- MPA default, easily upgrade to client-side React or HTMX
- Built-in critical CSS inlining
- Live browser refresh during development
- And more...

## Simple usage

Below is an example of a simple Hwy page. You'll notice it looks a lot like Remix, and you're right!

```tsx
// src/pages/user/$user_id.page.tsx

import type { DataProps, PageProps } from "hwy";
import { UserProfile, getUser } from "./somewhere.js";

export async function loader({ params }: DataProps) {
	return await getUser(params.user_id);
}

export default function ({ loaderData }: PageProps<typeof loader>) {
	return <UserProfile user={loaderData} />;
}
```

## Get Started

If you want to dive right in, just open a terminal and run `npx create-hwy@latest` and follow the prompts.

If you'd prefer to read more first, take a peek at [our website](https://hwy.dev).

## Acknowledgements

Hwy's APIs are heavily inspired by Remix. If Remix didn't exist, Hwy likely wouldn't exist either. Hwy doesn't use any Remix code, but it still owes a big thanks to the Remix team (past and present) for their top-tier patterns design. If you're building something huge and important today, use Remix.

## Disclaimer

Hwy is in beta! Act accordingly.

## License

MIT License. Copyright (c) 2023 Samuel J. Cook.
