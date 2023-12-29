/* --------------------------------------------------------------------------------
 * HTMX-RELATED UTILS
 * ------------------------------------------------------------------------------*/

import type { Context } from "hono";

// REDIRECT -----------------------------------------------------------------------
function htmxRedirect({
  c,
  to,
  status,
  useHxLocation,
}: {
  c: Context;
  to: string;
  status?: number;
  useHxLocation?: boolean;
}) {
  c.status(status ?? 302);

  const isHxRequest = Boolean(c.req.raw.headers.get("HX-Request"));

  if (!isHxRequest) {
    return c.redirect(to);
  }

  if (to.startsWith("http")) {
    c.header("HX-Redirect", to);
    return c.body(null);
  }

  if (useHxLocation) {
    c.header("HX-Location", to);
    return c.body(null);
  }

  return c.redirect(to);
}

// DEFAULT BODY PROPS -------------------------------------------------------------
const baseBodyProps = {
  "hx-ext": "head-support",
  "hx-boost": "true",
  "hx-swap": "outerHTML",
  "hx-target": "this",
} as const;

const nprogressCallbackBodyProps = {
  "hx-on::before-request": "NProgress.start()",
  "hx-on::after-request": "NProgress.done()",
  "hx-on::history-restore": 'document.getElementById("nprogress")?.remove()',
} as const;

const idiomorphBodyProps = {
  "hx-ext": "head-support, morph",
  "hx-swap": "morph:innerHTML",
} as const;

function getDefaultHtmxBodyProps(options?: {
  nProgress?: boolean;
  idiomorph?: boolean;
}) {
  return {
    ...baseBodyProps,
    ...(options?.nProgress ? nprogressCallbackBodyProps : {}),
    ...(options?.idiomorph ? idiomorphBodyProps : {}),
  } as const;
}

// EXPORTS ------------------------------------------------------------------------
export { getDefaultHtmxBodyProps, htmxRedirect };
