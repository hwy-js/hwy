/* --------------------------------------------------------------------------------
 * HTMX-RELATED UTILS
 * ------------------------------------------------------------------------------*/

import {
  H3Event,
  getRequestHeader,
  sendRedirect,
  setResponseHeader,
  setResponseStatus,
} from "h3";
// REDIRECT -----------------------------------------------------------------------
function htmxRedirect({
  event,
  to,
  status,
  useHxLocation,
}: {
  event: H3Event;
  to: string;
  status?: number;
  useHxLocation?: boolean;
}) {
  setResponseStatus(event, status ?? 302);
  const isHxRequest = Boolean(getRequestHeader(event, "HX-Request"));
  if (!isHxRequest) {
    return sendRedirect(event, to, status);
  }
  if (to.startsWith("http")) {
    setResponseHeader(event, "HX-Redirect", to);
    return null;
  }
  if (useHxLocation) {
    setResponseHeader(event, "HX-Location", to);
    return null;
  }
  return sendRedirect(event, to, status);
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

function getDefaultHTMXBodyProps(options?: {
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
export { getDefaultHTMXBodyProps, htmxRedirect };
