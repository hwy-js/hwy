import { PageProps } from "hwy";
import { Boldtalic } from "../components/bold-italic.js";
import { CodeBlock } from "../components/code-block.js";
import { H3Wrapper } from "../components/h3-wrapper.js";
import { InlineCode } from "../components/inline-code.js";
import { Paragraph } from "../components/paragraph.js";
import { ListItem, UnorderedList } from "../components/unordered-list.js";

export default function ({ Outlet }: PageProps) {
  return (
    <>
      <Outlet />
      <BigHeading />
      <BundleBadge />
      <Quickstart />
      <WhatIsHwy />
      <Features />
      <GuidingPrinciples />
      <SimpleUsage />
      <GetStarted />
      <Acknowledgements />
      <Disclaimer />
    </>
  );
}

function BigHeading() {
  return (
    <h1 class="big-heading">
      Hwy is a <Boldtalic>simple</Boldtalic>, <Boldtalic>lightweight</Boldtalic>
      , and <Boldtalic>flexible</Boldtalic> web framework, built on{" "}
      <Boldtalic>Hono</Boldtalic> and <Boldtalic>HTMX</Boldtalic>.
    </h1>
  );
}

function BundleBadge() {
  return (
    <a
      href="https://pkg-size.dev/hwy"
      target="_blank"
      style={{ alignSelf: "start" }}
    >
      <img
        style={{
          width: "112px",
          height: "20px",
          background: "#7777",
          borderRadius: "4px",
        }}
        src="https://pkg-size.dev/badge/bundle/11742"
        title="Bundle size for hwy"
      />
    </a>
  );
}

function Quickstart() {
  return (
    <H3Wrapper heading="Quickstart">
      <InlineCode
        high_contrast
        style={{
          alignSelf: "flex-start",
          fontSize: "1.25rem",
          fontWeight: "bold",
          fontStyle: "italic",
        }}
      >
        npx create-hwy@latest
      </InlineCode>
    </H3Wrapper>
  );
}

function WhatIsHwy() {
  return (
    <H3Wrapper heading="What is Hwy?">
      <div class="flex-col-wrapper">
        <Paragraph>
          Hwy is a lot like NextJS or Remix, but it uses{" "}
          <Boldtalic>HTMX</Boldtalic> instead of React on the frontend.
        </Paragraph>

        <Paragraph>
          Hwy lets you write <Boldtalic>React-style JSX</Boldtalic> in{" "}
          <Boldtalic>nested, file-based routes</Boldtalic>, with{" "}
          <Boldtalic>Remix-style actions and parallel loaders</Boldtalic>.
        </Paragraph>

        <Paragraph>
          The backend server is built on <Boldtalic>Hono</Boldtalic>, so you
          have access to a rich, growing ecosystem with lots of middleware and
          wonderful docs.
        </Paragraph>

        <Paragraph>
          Hwy is <Boldtalic>100% server-rendered</Boldtalic>, but with the HTMX
          defaults Hwy sets up for you out of the box, your app still{" "}
          <Boldtalic>feels like an SPA</Boldtalic>.
        </Paragraph>

        <Paragraph>
          Links and forms are automatically{" "}
          <Boldtalic>progressively enhanced</Boldtalic> thanks to HTMX's{" "}
          <InlineCode>hx-boost</InlineCode> feature. Just use normal anchor tags
          and traditional form attributes.
        </Paragraph>

        <Paragraph>
          Because Hwy replaces the <Boldtalic>full page</Boldtalic> on
          transitions by default, everything stays <Boldtalic>simple</Boldtalic>
          . You don't have to return different components from different
          endpoints (unless you want to).
        </Paragraph>

        <Paragraph>
          And best of all,{" "}
          <Boldtalic>
            anything you can do with Hono or HTMX, you can do with Hwy
          </Boldtalic>
          .
        </Paragraph>
      </div>
    </H3Wrapper>
  );
}

function Features() {
  return (
    <H3Wrapper heading="Features">
      <UnorderedList style={{ gap: 0 }}>
        <ListItem>Server-rendered JSX / TSX</ListItem>
        <ListItem>Nested, file-based routing</ListItem>
        <ListItem>Remix-style actions and parallel loaders</ListItem>
        <ListItem>Rich Hono middleware ecosystem</ListItem>
        <ListItem>100% type-safe</ListItem>
        <ListItem>Server built on Hono</ListItem>
        <ListItem>Client built on HTMX</ListItem>
        <ListItem>Built-in critical CSS inlining</ListItem>
        <ListItem>Live browser refresh during development</ListItem>
        <ListItem>And more...</ListItem>
      </UnorderedList>
    </H3Wrapper>
  );
}

function GuidingPrinciples() {
  return (
    <H3Wrapper heading="Guiding principles">
      <UnorderedList style={{ gap: 0 }}>
        <ListItem>No speed limits</ListItem>
        <ListItem>Numerous off-ramps</ListItem>
        <ListItem>Smooth, safe roads</ListItem>
        <ListItem>Clear traffic signs</ListItem>
      </UnorderedList>
    </H3Wrapper>
  );
}

function SimpleUsage() {
  return (
    <H3Wrapper heading="Simple usage">
      <div class="flex-col-wrapper">
        <Paragraph>
          Below is an example of a simple Hwy page. You'll notice it looks a lot
          like Remix, and you're right! Hwy is heavily inspired by Remix, but it
          uses HTMX instead of React.
        </Paragraph>

        <CodeBlock
          language="tsx"
          code={`
// src/pages/user/$user_id.page.tsx

import type { DataProps, PageProps } from 'hwy'
import { UserProfile, getUser } from './somewhere.js'

export async function loader({ params }: DataProps) {
  return await getUser(params.user_id)
}

export default function ({ loaderData }: PageProps<typeof loader>) {
  return <UserProfile user={loaderData} />
}
`}
        />
      </div>
    </H3Wrapper>
  );
}

function GetStarted() {
  return (
    <H3Wrapper heading="Get started">
      <div class="flex-col-wrapper">
        <Paragraph>
          If you want to dive right in, just open a terminal and run{" "}
          <InlineCode>npx create-hwy@latest</InlineCode> and follow the prompts.
        </Paragraph>

        <Paragraph>
          If you'd prefer to read more first, take a peek at{" "}
          <a href="/docs" style={{ textDecoration: "underline" }}>
            our docs
          </a>
          .
        </Paragraph>
      </div>
    </H3Wrapper>
  );
}

function Acknowledgements() {
  return (
    <H3Wrapper heading="Acknowledgements">
      <Paragraph>
        Hwy's APIs are obviously inspired by Remix. If Remix didn't exist, Hwy
        likely wouldn't exist either. Hwy doesn't use any Remix code, but it
        still owes a big thanks to the Remix team (past and present) for their
        top-tier patterns design. If you're building something huge and
        important today, use Remix.
      </Paragraph>
    </H3Wrapper>
  );
}

function Disclaimer() {
  return (
    <H3Wrapper heading="Disclaimer">
      <Paragraph>Hwy is in beta! Act accordingly.</Paragraph>
    </H3Wrapper>
  );
}
