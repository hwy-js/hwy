import { HeadFunction } from "hwy";
import { CodeBlock } from "../components/code-block.js";
import { AnchorHeading } from "../components/anchor-heading.js";
import { Paragraph } from "../components/paragraph.js";
import { InlineCode } from "../components/inline-code.js";
import { ListItem, UnorderedList } from "../components/unordered-list.js";
import { Boldtalic } from "../components/bold-italic.js";

export const head: HeadFunction = () => {
  return [
    { title: "Hwy Framework Docs" },
    {
      tag: "meta",
      props: {
        name: "description",
        content:
          "Documentation for the Hwy framework, a simple, lightweight, and flexible web framework, built on Hono and HTMX.",
      },
    },
  ];
};

export default async function () {
  return (
    <div class="flex-col-wrapper-bigger">
      <h2 class="h2">Docs</h2>
      <AnchorHeading content="Creating a new project" />
      <Paragraph>
        To create a new project, open a terminal and run the following commands
        (adjust as appropriate for your preferred package manager):
      </Paragraph>
      <CodeBlock
        language="bash"
        code={`npx create-hwy@latest\nnpm i\nnpm run dev`}
      />
      <AnchorHeading content="Project structure" />
      <Paragraph>A simple Hwy project is structured like this:</Paragraph>
      <CodeBlock
        language="bash"
        code={`
root
├── public/
│   ├── favicon.ico
├── src/
│   ├── pages/
│   │   ├── _index.page.tsx
│   │   ├── $.page.tsx
│   ├── styles/
│   │   ├── global.bundle.css
│   │   ├── global.critical.css
│   ├── client.entry.ts
│   ├── main.tsx
│   .gitignore
│   ...
        `}
      />
      <Paragraph>
        The <InlineCode>public</InlineCode> directory is where you'll put
        static, public assets, such as favicons, opengraph images, font files,
        etc.
      </Paragraph>
      <Paragraph>
        The <InlineCode>src</InlineCode> directory is where you'll put your
        source files. Most of the structure is completely up to you, but there
        are a few conventions that Hwy expects.
      </Paragraph>
      <AnchorHeading content="Pages directory" />
      <Paragraph>
        First, you must have a <InlineCode>src/pages</InlineCode> directory.
        This is where you'll put your page files. This is similar to the
        "routes" directory in Remix.
      </Paragraph>
      <Paragraph>
        The rules are very simple:
        <UnorderedList>
          <ListItem>
            Pages should include <InlineCode>.page.</InlineCode> (e.g.,
            <InlineCode>about.page.tsx</InlineCode>) in the filename. If you
            want co-location in this directory, you can always just exclude the{" "}
            <InlineCode>.page.</InlineCode> part in any filename (e.g.,
            <InlineCode>about-components.tsx</InlineCode>).
          </ListItem>

          <ListItem>
            Directory names will become part of the path, unless they are
            prefixed with double underscores. For example, if you have a{" "}
            <InlineCode>src/pages/foo</InlineCode> directory, and a file inside
            the <InlineCode>foo</InlineCode> directory called{" "}
            <InlineCode>bar.page.tsx</InlineCode> (
            <InlineCode>/src/pages/foo/bar.page.tsx</InlineCode>
            ), the path would be <InlineCode>example.com/foo/bar</InlineCode>.
            If you want the directory to be ignored, prefix it with two
            underscores (e.g., <InlineCode>__foo</InlineCode>). In that case,
            the route will just be <InlineCode>example.com/bar</InlineCode>.
          </ListItem>

          <ListItem>
            If you want a default index page inside at any route, just include
            an <InlineCode>_index.page.tsx</InlineCode> file in that directory.
            This includes the <InlineCode>pages</InlineCode> directory itself;{" "}
            <InlineCode>/src/pages/_index.page.tsx</InlineCode> will be the
            default route for your site.
          </ListItem>

          <ListItem>
            If you want to include a layout for a route (e.g., a sidebar or
            sub-navigation), include a file with the same name as the directory
            (but with <InlineCode>.page.tsx</InlineCode> included) as a sibling
            to the route directory. For example, if you have a route at{" "}
            <InlineCode>/foo/bar</InlineCode>, you can include a layout at
            <InlineCode>/src/pages/foo/bar.page.tsx</InlineCode> and a default
            page at <InlineCode>/src/pages/foo/bar/_index.page.tsx</InlineCode>.
            Note that any layouts for your main home page (
            <InlineCode>src/_index.page.tsx</InlineCode>), such as a global
            navigation header, should be inserted into your root component that
            is rendered from your main server entry point (i.e.,{" "}
            <InlineCode>src/main.tsx</InlineCode>).
          </ListItem>

          <ListItem>
            If you want to include dynamic child routes, you can just prefix the
            file name with a dollar sign (<InlineCode>$</InlineCode>). For
            example, if you have a route at <InlineCode>/foo/bar</InlineCode>,
            you can include a dynamic child route at{" "}
            <InlineCode>/src/pages/foo/bar/$id.page.tsx</InlineCode>. This will
            match any route that starts with <InlineCode>/foo/bar/</InlineCode>{" "}
            and will pass the id as a parameter to the page (including the
            page's loader, action, and component... more on this later). The{" "}
            <InlineCode>/foo/bar</InlineCode> route will still render the index
            page, if you have one.
            <br />
            <br />
            NOTE: One "gotcha" with this is that you need to use a string that
            would be safe to use as a JavaScript variable for your dynamic
            properties. For example,{" "}
            <InlineCode>/src/pages/$user_id.page.tsx</InlineCode> would be fine,
            but <InlineCode>/src/pages/$user-id.page.tsx</InlineCode> would not.
          </ListItem>

          <ListItem>
            If you want to have "catch-all" or "splat" routes, you can include a
            file named simply <InlineCode>$.page.tsx</InlineCode>. This will
            match any route that hasn't already been matched by a more specific
            route. You can also include a top-level 404 page by including a file
            named <InlineCode>$.page.tsx</InlineCode> in{" "}
            <InlineCode>src/pages</InlineCode>. Any splat parameters "caught" by
            one of these routes will be passed into the page.
          </ListItem>
        </UnorderedList>
      </Paragraph>
      <AnchorHeading content="Page components" />
      <Paragraph>
        Pages are very simple as well. They are simply JSX components default
        exported from a page route file. Again, a page route file is any file in
        the <InlineCode>src/pages</InlineCode> directory that includes{" "}
        <InlineCode>.page.</InlineCode> in the filename. For example,
        <InlineCode>src/pages/about.page.tsx</InlineCode> is a page file.
      </Paragraph>
      <CodeBlock
        language="tsx"
        code={`
// src/pages/about.page.tsx

export default function () {
  return (
    <p>
      I like baseball.
    </p>
  )
}
        `}
      />
      <Paragraph>
        Pages are passed a <InlineCode>PageProps</InlineCode> object, which
        contains a bunch of helpful properties. Here are all the properties
        available on the PageProps object:
      </Paragraph>
      <CodeBlock
        language="tsx"
        code={`
export default function ({
  c,
  loaderData,
  actionData,
  Outlet,
  params,
  splatSegments,
}: PageProps<typeof loader, typeof action>) {
  return (
    <div>
      I like {loaderData?.sport}.
      <Outlet />
    </div>
  )
}
        `}
      />
      <Paragraph>
        <UnorderedList>
          <ListItem>
            <InlineCode>c</InlineCode> - This is the Hono Context object. It
            contains the request and response objects, as well as some other
            useful properties and methods. See the{" "}
            <a
              href="https://hono.dev"
              target="_blank"
              style={{
                textDecoration: "underline",
              }}
            >
              Hono docs
            </a>{" "}
            for more info.
          </ListItem>

          <ListItem>
            <InlineCode>loaderData</InlineCode> - This is the data returned from
            the route loader. If you aren't using a route loader, this will be{" "}
            <InlineCode>undefined</InlineCode>. If you are using a route loader
            and pass in <InlineCode>typeof loader</InlineCode> as a generic to{" "}
            <InlineCode>PageProps</InlineCode>, this will be 100% type-safe.
          </ListItem>

          <ListItem>
            <InlineCode>actionData</InlineCode> - Same as{" "}
            <InlineCode>loaderData</InlineCode>, except in this case the data
            comes from your route's action, if applicable. If you are using a
            route action but <Boldtalic>not</Boldtalic> a route loader, this is
            how you'd handle the generics:{" "}
            <InlineCode>{`PageProps<never, typeof action>`}</InlineCode>.
          </ListItem>

          <ListItem>
            <InlineCode>Outlet</InlineCode> - This is the outlet for the page,
            and it's where child routes get rendered. You render outlets just
            like any other component (you can even pass in props if you want): (
            <InlineCode>{`<Outlet whatever={whatever} />`}</InlineCode>)
          </ListItem>

          <ListItem>
            <InlineCode>params</InlineCode> - This is an object containing any
            parameters passed to the page. For example, if you have a page at{" "}
            <InlineCode>src/pages/foo/bar/$id.page.tsx</InlineCode>, the{" "}
            <InlineCode>params</InlineCode> object will contain a property
            called <InlineCode>id</InlineCode> with the value of the{" "}
            <InlineCode>id</InlineCode> parameter. In other words, if the user
            visits the route <InlineCode>example.com/foo/bar/123</InlineCode>,
            the <InlineCode>params</InlineCode> object will be{" "}
            <InlineCode>{`{ id: '123' }`}</InlineCode>.
          </ListItem>

          <ListItem>
            <InlineCode>splatSegments</InlineCode> - This is an array of any
            "splat" segments caught by the "deepest" splat route. For example,
            if you have a page at{" "}
            <InlineCode>src/pages/foo/bar/$.page.tsx</InlineCode> (a splat
            route) and the user visits{" "}
            <InlineCode>example.com/foo/bar/123/456</InlineCode>, the{" "}
            <InlineCode>splatSegments</InlineCode> array will be{" "}
            <InlineCode>{`['123', '456']`}</InlineCode>.
          </ListItem>
        </UnorderedList>
      </Paragraph>
      <Paragraph>
        <InlineCode>PageProps</InlineCode> is also a generic type, which takes{" "}
        <InlineCode>typeof loader</InlineCode> and{" "}
        <InlineCode>typeof action</InlineCode> as its two parameters,
        respectively. These are the types of the loader and action functions for
        the page (more on this later). If you aren't using data functions for a
        certain page, you can just skip the generics.
      </Paragraph>
      <Paragraph>
        One cool thing about Hwy is that you have access to the Hono Context
        from within your page components. This means you can do things like set
        response headers right inside your page components. You can also do this
        from loaders and actions if you prefer.
      </Paragraph>
      <CodeBlock
        language="tsx"
        code={`
import { PageProps } from 'hwy'

export default function ({ c }: PageProps) {
  c.res.headers.set('cache-control', 'whatever')

  return <Whatever />
}
        `}
      />
      <AnchorHeading content="Page loaders" />
      <Paragraph>
        Page loaders are functions named "loader" that are exported from a page
        file. They are passed a subset of the PageProps object:{" "}
        <InlineCode>c</InlineCode>, <InlineCode>params</InlineCode>, and{" "}
        <InlineCode>splatSegments</InlineCode>. The typescript type exported by
        Hwy for this object is called <InlineCode>DataProps</InlineCode>, which
        can take an optional generic of your Hono Env type (see the Hono docs
        for more details on that, and why you might want to do that).
      </Paragraph>
      <Paragraph>
        Loaders run before your page is returned, and they all run in parallel.
        They are useful for fetching data, and any data returned from a loader
        will be passed to its associated page component. They can also be useful
        for redirecting to another page (covered a little later).
      </Paragraph>
      <Paragraph>
        If you want to consume data from a loader in your page component
        (usually you will), then you should just return standard raw data from
        the loader, like this:
      </Paragraph>
      <CodeBlock
        language="tsx"
        code={`
import type { DataProps } from 'hwy'

export function loader({ c }: DataProps) {
  return "baseball" as const
}

export default function ({ loaderData }: PageProps<typeof loader>) {
  return (
    <p>
      I like {loaderData}. // I like baseball.
    </p>
  )
}
`}
      />
      <Paragraph>
        If you return a Response object, then that will "take over" and be
        returned from the route instead of your page. This is fine if you're
        creating a "resource route" (more on this below), but usually it's not
        what you want.
      </Paragraph>
      <Paragraph>
        However, one thing that is more common is that you may want to return a
        redirect from a loader. You can do this with a Response object if you
        want, but Hwy exports a helper function that covers more edge cases and
        is built to work nicely with the HTMX request lifecycle.
      </Paragraph>
      <CodeBlock
        language="tsx"
        code={`
import { redirect, type DataProps } from 'hwy'

export function loader({ c }: DataProps) {
  return redirect({ c, to: '/login' })
}
`}
      />
      <Paragraph>
        You can also "throw" a <InlineCode>redirect</InlineCode> if you want,
        which can be helpful in keeping your typescript types clean.
      </Paragraph>
      <AnchorHeading content="Server components" />
      <Paragraph>
        In addition to using loaders to load data in parallel before rendering
        any components, you can also load data inside your Hwy page components.
        Be careful with this, as it can introduce waterfalls, but if you are
        doing low-latency data fetching and prefer that pattern, it's available
        to you in Hwy.
      </Paragraph>
      <CodeBlock
        language="tsx"
        code={`
// src/some-page.page.tsx

export default async function ({ Outlet }: PageProps) {
  const someData = await getSomeData()

  return (
    <div>
      {JSON.stringify(someData)}

      <Outlet />
    </div>
  )
}
      `}
      />
      <Paragraph>
        You can also pass data to the child outlet if you want, and it will be
        available in the child page component's props. Here's how that would
        look in the parent page component:
      </Paragraph>
      <CodeBlock language="tsx" code={`<Outlet someData={someData} />`} />
      <Paragraph>
        And in the child component, you'll want to use{" "}
        <InlineCode>{`PageProps & { someData: SomeType }`}</InlineCode> as your
        prop type.
      </Paragraph>
      <Paragraph>
        Another way of doing this would be to use Hono's{" "}
        <InlineCode>c.set('some-key', someData)</InlineCode> feature. If you do
        that, any child component will be able to access the data without
        re-fetching via <InlineCode>c.get('some-key')</InlineCode>.
      </Paragraph>
      <Paragraph>The world is your oyster!</Paragraph>
      <AnchorHeading content="Page actions" />
      <Paragraph>
        Page actions behave just like loaders, except they don't run until you
        call them (usually from a form submission). Loaders are for
        loading/fetching data, and actions are for mutations. Use actions when
        you want to log users in, mutate data in your database, etc.
      </Paragraph>
      <Paragraph>
        Data returned from an action will be passed to the page component as the{" "}
        <InlineCode>actionData</InlineCode> property on the{" "}
        <InlineCode>PageProps</InlineCode> object. Unlike loaders, which are
        designed to run in parallel and pass different data to each nested
        component, actions are called individually and return the same{" "}
        <InlineCode>actionData</InlineCode> to all nested components.
      </Paragraph>
      <Paragraph>
        Here is an example page with a login form. Note that this is highly
        simplified and not intended to be used in production. It is only
        intended to show how actions work.
      </Paragraph>
      <CodeBlock
        language="tsx"
        code={`
import { DataProps, PageProps } from 'hwy'
import { getFormStrings } from '@hwy-js/utils'
import { logUserIn } from './somewhere.js'

export async function action({ c }: DataProps) {
  const { email, password } = await getFormStrings({ c })
  return await logUserIn({ email, password })
}

export default function ({ actionData }: PageProps<never, typeof action>) {
  if (actionData?.success) {
    return <p>Success!</p>
  }

  return (
    <form action="/login" method="POST">
      <input name="email" type="email" />
      <input name="password" type="password" />
      <button type="submit">Login</button>
    </form>
  )
}
      `}
      />
      <Paragraph>
        This form uses 100% standard html attributes, and it will be
        automatically progressively enhanced by HTMX (uses the{" "}
        <InlineCode>hx-boost</InlineCode> feature). If JavaScript doesn't load
        for some reason, it will fall back to traditional web behavior
        (full-page reload).
      </Paragraph>
      <AnchorHeading content="Resource routes" />
      <Paragraph>
        Remix has the concept of "resource routes", where you can define loaders
        and actions without defining a default export component, and then use
        them to build a view-less API.
      </Paragraph>
      <Paragraph>
        In Hwy, you're probably better off just using your Hono server directly
        for this, as it's arguably more traditional, straightforward, and
        convenient. However, if you really want to use resource routes with
        Hwy's file-based routing, nothing is stopping you! You can do so by just
        making sure you return a fetch <InlineCode>Response</InlineCode> object
        from your loader or action. For example:
      </Paragraph>
      <CodeBlock
        language="tsx"
        code={`
// src/pages/api/example-resource-root.ts

export function loader() {
  return new Response('Hello from resource route!')
}
`}
      />
      <Paragraph>
        All of that being said, Hwy is designed to work with HTMX-style
        hypermedia APIs, not JSON APIs. So if you return JSON from a resource
        route or a normal Hono endpoint, you'll be in charge of handling that on
        the client side. This will likely entail disabling HTMX on the form
        submission, doing an <InlineCode>e.preventDefault()</InlineCode> in the
        form's onsubmit handler, and then doing a standard fetch request to the
        Hono endpoint. You can then parse the JSON response and do whatever you
        want with it.
      </Paragraph>
      <Paragraph>
        You probably don't need to do this, and if you think you do, I would
        challenge you to try using the hypermedia approach instead. If you still
        decide you need to use JSON, this is roughly the escape hatch.
      </Paragraph>
      <AnchorHeading content="Error boundaries" />
      <Paragraph>
        Any Hwy page can export an <InlineCode>ErrorBoundary</InlineCode>{" "}
        component, which takes the same parameters as{" "}
        <InlineCode>loaders</InlineCode> and <InlineCode>actions</InlineCode>,
        as well as the error itself. The type for the ErrorBoundary component
        props is exported as <InlineCode>ErrorBoundaryProps</InlineCode>. If an
        error is thrown in the page or any of its children, the error will be
        caught and passed to the nearest applicable parent error boundary
        component. You can also pass a default error boundary component that
        effectively wraps your outermost <InlineCode>RootOutlet</InlineCode> (in{" "}
        <InlineCode>main.tsx</InlineCode>) like so:
      </Paragraph>
      <CodeBlock
        language="tsx"
        code={`
import type { ErrorBoundaryProps } from 'hwy'

...

<RootOutlet
  c={c}
  activePathData={activePathData}
  fallbackErrorBoundary={(props: ErrorBoundaryProps) => {
    return <div>{props.error.message}</div>
  }}
/>
      `}
      />
      <AnchorHeading content="Hono middleware and variables" />
      <Paragraph>
        You will very likely find yourself in a situation where there is some
        data you'd like to fetch before you even run your loaders, and you'd
        like that data to be available in all downstream loaders and page
        components. Here's how you might do it:
      </Paragraph>
      <CodeBlock
        language="tsx"
        code={`
app.use('*', async (c, next) => {
  const user = await getUserFromCtx(c)

  c.set('user', user)

  await next()
})
`}
      />
      <Paragraph>
        This isn't very typesafe though, so you'll want to make sure you create
        app-specific types. For this reason, all Hwy types that include the Hono
        Context object are generic, and you can pass your app-specific Hono Env
        type as a generic to the PageProps object. For example:
      </Paragraph>
      <CodeBlock
        language="tsx"
        code={`
import type { DataProps } from 'hwy'

type AppEnv = {
  Variables: {
    user: Awaited<ReturnType<typeof getUserFromCtx>>
  }
}

type AppDataProps = DataProps<AppEnv>

export async function loader({ c }: AppDataProps) {
  // this will be type safe!
  const user = c.get('user')
}
`}
      />
      <AnchorHeading content="Main.tsx" />
      <Paragraph>
        In your <InlineCode>main.tsx</InlineCode> file, you'll have a handler
        that looks something like this.
      </Paragraph>
      <CodeBlock
        language="tsx"
        code={`
import {
  CssImports,
  RootOutlet,
  DevLiveRefreshScript,
  ClientScripts,
  getDefaultBodyProps,
  renderRoot,
} from 'hwy'

app.all('*', async (c, next) => {
  return await renderRoot({ 
    c,
    next,
    root: ({ activePathData }) => {
      return (
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
  
            <HeadElements
              c={c}
              activePathData={activePathData}
              defaults={defaultHeadBlocks}
            />
  
            <CssImports />
            <ClientScripts activePathData={activePathData} />
            <DevLiveRefreshScript />
          </head>
  
          <body {...getDefaultBodyProps()}>
            <RootOulet
              c={c}
              activePathData={activePathData}
              fallbackErrorBoundary={FallbackErrorBoundary}
            />
          </body>
        </html>
      )
    },
    experimentalStreaming: false, // optional
  })
})
      `}
      />
      <Paragraph>
        The easiest way to get this set up correctly is to bootstrap your app
        with <InlineCode>npx create-hwy@latest</InlineCode>.
      </Paragraph>
      <AnchorHeading content="Document head (page metadata)" />
      <Paragraph>
        Your document's <InlineCode>head</InlineCode> is rendered via the{" "}
        <InlineCode>{`HeadElements`}</InlineCode> component in your{" "}
        <InlineCode>main.tsx</InlineCode> file, like this:
      </Paragraph>
      <CodeBlock
        language="tsx"
        code={`
<HeadElements
  activePathData={activePathData}
  c={c}
  defaults={[
    { title: 'Hwy Framework' },
    {
      tag: 'meta',
      props: {
        name: 'description',
        content:
          'Hwy is a simple, lightweight, and flexible web framework, built on Hono and HTMX.',
      },
    },
  ]}
/>
      `}
      />
      <Paragraph>
        As you can probably see, the "defaults" property takes an array of head
        elements. "Title" is a special one, in that it is just an object with a
        title key. Other elements are just objects with a tag and props key. The
        props key is an object of key-value pairs that will be spread onto the
        element.
      </Paragraph>
      <Paragraph>
        The defaults you set here can be overridden at any Hwy page component by
        exporting a <InlineCode>head</InlineCode> function. For example:
      </Paragraph>
      <CodeBlock
        language="tsx"
        code={`
import { HeadFunction } from 'hwy'

export const head: HeadFunction = (props) => {
  // props are the same as PageProps, but without the Outlet

  return [
    { title: 'Some Child Page' },
    {
      tag: 'meta',
      props: {
        name: 'description',
        content:
          'Description for some child page.',
      },
    },
  ]
}
`}
      />
      <Paragraph>
        This will override any conflicting head elements set either by an
        ancestor page component or by the root defaults. The{" "}
        <InlineCode>head</InlineCode> function is passed all the same props as a
        page component, excluding <InlineCode>Outlet</InlineCode>.
      </Paragraph>
      <AnchorHeading content="Styling" />
      <Paragraph>
        Hwy includes built-in support for several CSS patterns, including a very
        convenient way to inline critical CSS. CSS is rendered into your app
        through the <InlineCode>CssImports</InlineCode> component. That
        component in turn reads from the <InlineCode>src/styles</InlineCode>{" "}
        directory, which is where you should put your CSS files. Inside the
        styles directory, you can put two types of CSS files:{" "}
        <InlineCode>critical</InlineCode> and <InlineCode>bundle</InlineCode>.
        Any files that include <InlineCode>.critical.</InlineCode> in the
        filename will be concatenated (sorted alphabetically by file name),
        processed by esbuild, and inserted inline into the{" "}
        <InlineCode>head</InlineCode> of your document. Any files that include{" "}
        <InlineCode>.bundle.</InlineCode> in the filename will similarly be
        concatenated (sorted alphabetically by file name), processed by esbuild,
        and inserted as a standard linked stylesheet in the{" "}
        <InlineCode>head</InlineCode> of your document.
      </Paragraph>
      <Paragraph>
        It's also very easy to configure Tailwind, if that's your thing. To see
        how this works, spin up a new project with{" "}
        <InlineCode>npx create-hwy@latest</InlineCode> and select "Tailwind"
        when prompted.
      </Paragraph>
      <Paragraph>
        And of course, if you don't like these patterns, you can just choose not
        to use them, and do whatever you want for styling instead!
      </Paragraph>
      <AnchorHeading content="Deployment" />
      <Paragraph>
        Hwy can be deployed to any Node-compatible runtime with filesystem read
        access. This includes more traditional Node app hosting like Render.com
        or Railway.app, or Vercel (Lambda), or Deno Deploy. This should also
        include Bun once that ecosystem becomes more stable and has more hosting
        options. Just choose your preferred deployment target when you run{" "}
        <InlineCode>npx create-hwy@latest</InlineCode>.
      </Paragraph>
      <Paragraph>
        Cloudflare is a bit trickier, however, because Hwy reads from the
        filesystem at runtime. We may add support for this in the future through
        a specialized build step, but for now, it's not supported. This also
        means that Vercel edge functions are not supported, as they rely on
        Cloudflare Workers, which do not have runtime read access to the
        filesystem. Normal Vercel serverless, which runs on AWS Lambda under the
        hood, will work just fine.
      </Paragraph>
      <AnchorHeading content="Progressive enhancement" />
      <Paragraph>
        When you included the <InlineCode>hx-boost</InlineCode> attribute on the{" "}
        <InlineCode>body</InlineCode> tag (included by default when you use{" "}
        <InlineCode>getDefaultBodyProps</InlineCode>), anchor tags (links) and
        form submissions will be automatically progressively enhanced. For
        forms, include the traditional attributes, like this:
        <CodeBlock
          language="tsx"
          code={`<form action="/login" method="POST">`}
        />
      </Paragraph>
      <AnchorHeading content="Random" />
      <Paragraph>
        Here is some random stuff that is worth noting, but doesn't fit well
        into any existing sections.
      </Paragraph>
      <UnorderedList>
        <ListItem>HTMX handles scroll restoration for you!</ListItem>
        <ListItem>
          Code splitting is not a concern with this architecture.
        </ListItem>
        <ListItem>
          <InlineCode>@hwy/dev</InlineCode> is in a separate package so that it
          doesn't need to be loaded in production. This probably doesn't matter
          much, but theoretically it could help with cold starts if you're
          deploying to serverless.
        </ListItem>
        <ListItem>Never have to fix a hydration error again.</ListItem>
      </UnorderedList>
      <AnchorHeading content="Using Hwy without HTMX" />
      <Paragraph>
        If you would like to use Hwy like a traditional MPA framework, and skip
        using HTMX, you can do so simply by excluding HTMX from your{" "}
        <InlineCode>src/client.entry.ts</InlineCode> file.
      </Paragraph>
      <AnchorHeading content="Security" />
      <Paragraph>A few points on security:</Paragraph>
      <UnorderedList>
        <ListItem>
          <Paragraph>
            Similar to React, Hono JSX rendering will automatically escape the
            outputted html. If you want to render scripts, you should do the
            classic React thing (works the same with Hono JSX):
          </Paragraph>

          <br />
          <CodeBlock
            language="tsx"
            code={`
<script
  dangerouslySetInnerHTML={{
    __html: \`console.log('hello world')\`,
  }}
/>
        `}
          />
        </ListItem>
        <ListItem>
          When you implement auth in your app, make sure you consider CSRF
          protection. Hwy isn't doing anything special there. It's your
          responsibility to get that right.
        </ListItem>
        <ListItem>
          When you use <InlineCode>npx create-hwy@latest</InlineCode>, we
          include the Hono secure headers middleware for you. Please see the
          Hono docs for more info on what that is doing, and make sure it's
          appropriate for your use case.
        </ListItem>
      </UnorderedList>
      <AnchorHeading content="Self-vendoring" />
      <Paragraph>
        If you would like to self-vendor your dependencies instead of using a{" "}
        <InlineCode>src/client.entry.ts</InlineCode> file (which is bundled with
        esbuild), you can do so simply by including your dependencies in the{" "}
        <InlineCode>/public</InlineCode> directory and referencing them in a
        script. For example:
        <CodeBlock
          language="tsx"
          code={`
<script
  src={getPublicUrl('your-script.js')}
  defer
/>
        `}
        />
      </Paragraph>
      <AnchorHeading content="Roadmap" />
      <Paragraph>
        Other than the obvious (stabilize APIs, more tests, better docs, etc.),
        here are a few things open for consideration on the roadmap:
      </Paragraph>
      <UnorderedList>
        <ListItem>
          A simple solution for identifying "active" navigation links, similar
          perhaps to Remix's <InlineCode>NavItem</InlineCode> component. For
          now, it shouldn't be too hard to build one yourself.
        </ListItem>

        <ListItem>
          It would be nice to have a built-in solution for link prefetching.
        </ListItem>

        <ListItem>What else? You tell me!</ListItem>
      </UnorderedList>
    </div>
  );
}
