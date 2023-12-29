# Hwy

Hwy is a simple, lightweight, and flexible web framework, built on Hono and
HTMX.

<a href="https://pkg-size.dev/hwy" target="_blank">
  <img
    width="112"
    height="20"
    style="background:darkgray;border-radius:4px;"
    src="https://pkg-size.dev/badge/bundle/11742"
    title="Bundle size for hwy"
  />
</a>

## Quick Start

```bash
npx create-hwy@latest
```

## What is Hwy?

Hwy is a lot like NextJS or Remix, but it uses **_HTMX_** instead of React on
the frontend.

Hwy lets you write **_React-style JSX_** in **_nested, file-based routes_**,
with **_Remix-style actions and parallel loaders_**.

The backend server is built on **_Hono_**, so you have access to a rich, growing
ecosystem with lots of middleware and wonderful docs.

Hwy is **_100% server-rendered_**, but with the HTMX defaults Hwy sets up for
you out of the box, your app still **_feels like an SPA_**.

Links and forms are automatically **_progressively enhanced_** thanks to HTMX's
`hx-boost` feature. Just use normal anchor tags and traditional form attributes.

Because Hwy replaces the **_full page_** on transitions by default, everything
stays **_simple_**. You don't have to return different components from different
endpoints (unless you want to).

And best of all, **_anything you can do with Hono or HTMX, you can do with
Hwy_**.

## Features

- Server-rendered JSX / TSX
- Nested, file-based routing
- Remix-style actions and parallel loaders
- Rich Hono middleware ecosystem
- 100% type-safe
- Server built on Hono
- Client built on HTMX
- Built-in critical CSS inlining
- Live browser refresh during development
- And more...

## Guiding Principles

- No speed limits
- Numerous off-ramps
- Smooth, safe roads
- Clear traffic signs

## Simple usage

Below is an example of a simple Hwy page. You'll notice it looks a lot like
Remix, and you're right! Hwy is heavily inspired by Remix, but it uses HTMX
instead of React.

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

If you want to dive right in, just open a terminal and run
`npx create-hwy@latest` and follow the prompts.

If you'd prefer to read more first, take a peek at
[our docs](https://hwy.dev/docs).

## Acknowledgements

Hwy's APIs are obviously inspired by Remix. If Remix didn't exist, Hwy likely
wouldn't exist either. Hwy doesn't use any Remix code, but it still owes a big
thanks to the Remix team (past and present) for their top-tier patterns design.
If you're building something huge and important today, use Remix.

## Disclaimer

Hwy is in beta! Act accordingly.

## License

MIT License

Copyright (c) 2023 Samuel J. Cook
