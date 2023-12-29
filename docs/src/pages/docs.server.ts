import { type HeadFunction } from "hwy";

export const head: HeadFunction = () => {
  return [
    { title: "Hwy Framework Docs" },
    {
      tag: "meta",
      attributes: {
        name: "description",
        content:
          "Documentation for the Hwy framework, a simple, lightweight, and flexible web framework, built on Hono and HTMX.",
      },
    },
  ];
};
