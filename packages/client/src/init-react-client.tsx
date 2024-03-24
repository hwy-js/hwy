import { createBrowserHistory } from "history";
import { startTransition } from "react";
import {
  CLIENT_GLOBAL_KEYS,
  HWY_PREFIX,
  getHwyClientGlobal,
} from "../../common/index.mjs";

let isNavigating = false;
let isSubmitting = false;
let isRevalidating = false;

const abortControllers = new Map<string, AbortController>();

function handleAbortController(key: string) {
  const needsAbort = abortControllers.has(key);
  if (needsAbort) {
    const controller = abortControllers.get(key);
    controller?.abort();
    abortControllers.delete(key);
  }
  const newController = new AbortController();
  abortControllers.set(key, newController);
  return { abortController: newController, didAbort: needsAbort };
}

const hwyClientGlobal = getHwyClientGlobal();

function getIsInternalLink(href: string) {
  try {
    if (!href.startsWith("http://") && !href.startsWith("https://")) {
      return true;
    }
    const linkURL = new URL(href);
    const currentOrigin = window.location.origin;
    return linkURL.origin === currentOrigin;
  } catch (e) {
    console.error("Invalid URL:", href);
    return false;
  }
}

let customHistory: ReturnType<typeof createBrowserHistory>;
let lastKnownCustomLocation: (typeof customHistory)["location"];

const scrollStateMapKey = "__hwy__scrollStateMap";
type ScrollStateMap = Map<string, { x: number; y: number }>;

function getScrollStateMapFromLocalStorage() {
  const scrollStateMapString = localStorage.getItem(scrollStateMapKey);
  let scrollStateMap: ScrollStateMap;
  if (scrollStateMapString) {
    scrollStateMap = new Map(JSON.parse(scrollStateMapString));
  } else {
    scrollStateMap = new Map();
  }
  return scrollStateMap;
}

function setScrollStateMapToLocalStorage(newScrollStateMap: ScrollStateMap) {
  localStorage.setItem(
    scrollStateMapKey,
    JSON.stringify(Array.from(newScrollStateMap.entries())),
  );
}

function setScrollStateMapSubKey(key: string, value: { x: number; y: number }) {
  const scrollStateMap = getScrollStateMapFromLocalStorage();
  scrollStateMap.set(key, value);

  // if new item would brought it over 50 entries, delete the oldest one
  if (scrollStateMap.size > 50) {
    const oldestKey = Array.from(scrollStateMap.keys())[0];
    scrollStateMap.delete(oldestKey);
  }

  setScrollStateMapToLocalStorage(scrollStateMap);
}

function readScrollStateMapSubKey(key: string) {
  const scrollStateMap = getScrollStateMapFromLocalStorage();
  return scrollStateMap.get(key);
}

function getShouldPreventLinkDefault(event: MouseEvent) {
  const anchor = (event.target as HTMLElement).closest("a");

  const shouldPreventDefault =
    anchor && // ignore clicks with no anchor
    anchor.target !== "_blank" && // ignore new tabs
    event.button !== 1 && // middle mouse button click
    !anchor.href.startsWith("#") && // ignore hash links
    !anchor.hasAttribute("download") && // ignore downloads
    !event.ctrlKey && // ignore ctrl+click
    !event.shiftKey && // ignore shift+click
    !event.metaKey && // ignore cmd+click
    !event.altKey && // ignore alt+click
    getIsInternalLink(anchor.href); // ignore external links

  return shouldPreventDefault;
}

async function initReactClient(hydrateFn: () => void) {
  customHistory = createBrowserHistory();

  lastKnownCustomLocation = customHistory.location;

  customHistory.listen(async function ({ action, location }) {
    if (action === "POP") {
      if (
        location.key !== lastKnownCustomLocation.key &&
        (location.pathname !== lastKnownCustomLocation.pathname ||
          location.search !== lastKnownCustomLocation.search)
      ) {
        await internalNavigate({
          href: window.location.href,
          navigationType: "browserHistory",
          scrollStateToRestore: readScrollStateMapSubKey(
            customHistory.location.key,
          ),
        });
      }
    }
  });

  customHistory.listen(({ action, location }) => {
    // save current scroll state to map
    setScrollStateMapSubKey(lastKnownCustomLocation.key, {
      x: window.scrollX,
      y: window.scrollY,
    });

    // now set lastKnownCustomLocation to new location
    lastKnownCustomLocation = location;
  });

  if (history.scrollRestoration && history.scrollRestoration !== "manual") {
    history.scrollRestoration = "manual";
  }

  const components = hwyClientGlobal.get("activePaths").map((x: any) => {
    return import(("." + x).replace("public/dist/", ""));
  });

  const awaitedComps = await Promise.all(components);

  hwyClientGlobal.set(
    "activeComponents",
    awaitedComps.map((x) => x.default),
  );

  hwyClientGlobal.set(
    "activeErrorBoundaries",
    awaitedComps.map((x) => x.ErrorBoundary),
  );

  startTransition(hydrateFn);

  document.body.addEventListener("click", async function (event) {
    const anchor = (event.target as HTMLElement).closest("a");

    if (!anchor || !anchor.dataset.boost || event.defaultPrevented) {
      return;
    }

    if (getShouldPreventLinkDefault(event)) {
      event.preventDefault();
      await internalNavigate({
        href: anchor.href,
        navigationType: "userNavigation",
      });
    }
  });

  window.addEventListener("submit", async function (event) {
    const form = event.target as HTMLFormElement;

    if (!form.dataset.boost || event.defaultPrevented) {
      return;
    }

    event.preventDefault();

    const action = form.action;
    const method = form.method;

    const formData = new FormData(form);

    const submitRes = await submit(action || window.location.href, {
      method,
      body: method.toLowerCase() === "get" ? undefined : formData,
    });

    if (submitRes.success) {
      const json = await submitRes.response.json();
      hwyClientGlobal.set("actionData", json.actionData);
      reRenderApp({ json, navigationType: "revalidation" });
    } else {
      console.error(submitRes.error);
    }
  });
}

type NavigationType =
  | "browserHistory"
  | "userNavigation"
  | "revalidation"
  | "redirect"
  | "buildIDCheck";

async function handleRedirects(props: {
  abortController: AbortController;
  url: URL;
  requestInit?: RequestInit;
}) {
  let res;

  const noBody =
    !props.requestInit?.method ||
    props.requestInit?.method.toLowerCase() === "get" ||
    props.requestInit?.body === undefined;

  const bodyParentObj = noBody
    ? {}
    : {
        body:
          props.requestInit?.body instanceof FormData
            ? props.requestInit.body
            : typeof props.requestInit?.body === "string"
              ? props.requestInit.body
              : JSON.stringify(props.requestInit?.body),
      };

  try {
    res = await fetch(props.url, {
      signal: props.abortController.signal,
      ...props.requestInit,
      ...bodyParentObj,
    });

    if (res?.redirected) {
      const newURL = new URL(res.url);

      if (!getIsInternalLink(newURL.href)) {
        // external link, hard redirecting
        window.location.href = newURL.href;
        return;
      }

      // internal link, soft redirecting
      await internalNavigate({
        href: newURL.href,
        navigationType: "redirect",
      });

      return;
    }
  } catch (e) {
    // If this was an attempted redirect,
    // potentially a CORS error here
    // Recommend returning a JSON instruction to redirect on client
    // with window.location.href = newURL.href;
    console.error(e);
  }

  return res;
}

function setStatus({
  type,
  value,
}: {
  type: NavigationType | "submission";
  value: boolean;
}) {
  if (type === "revalidation") {
    isRevalidating = value;
  } else if (type === "submission") {
    isSubmitting = value;
  } else if (type !== "buildIDCheck") {
    isNavigating = value;
  }
}

async function internalNavigate(props: {
  href: string;
  navigationType: NavigationType;
  scrollStateToRestore?: { x: number; y: number };
  replace?: boolean;
}) {
  setStatus({ type: props.navigationType, value: true });

  const abortControllerKey =
    props.href === "." || props.href === window.location.href
      ? "revalidate"
      : "navigate";
  const { abortController } = handleAbortController(abortControllerKey);

  try {
    const url = new URL(props.href, window.location.origin);

    url.searchParams.set(`${HWY_PREFIX}json`, "1");

    const res = await handleRedirects({
      abortController,
      url,
    });

    abortControllers.delete(abortControllerKey);

    if (!res || res.status !== 200) {
      setStatus({ type: props.navigationType, value: false });
      return;
    }

    const json = await res?.json();

    if (!json) {
      throw new Error("No JSON response");
    }

    if (json.buildID !== hwyClientGlobal.get("buildID")) {
      window.location.href = props.href;
      return;
    }

    if (props.navigationType === "buildIDCheck") {
      setStatus({ type: props.navigationType, value: false });
      return;
    }

    await reRenderApp({
      json,
      navigationType: props.navigationType,
    });

    // __TODO scroll to top on link clicks, but provide an opt-out
    // __TODO scroll to top on form responses, but provide an opt-out

    if (
      props.navigationType === "userNavigation" ||
      props.navigationType === "redirect"
    ) {
      if (
        props.href !== location.href &&
        props.navigationType !== "redirect" &&
        !props.replace
      ) {
        customHistory.push(props.href);
      } else {
        customHistory.replace(props.href);
      }
      window.scrollTo(0, 0);
    }

    if (
      props.navigationType === "browserHistory" &&
      props.scrollStateToRestore
    ) {
      window.scrollTo(
        props.scrollStateToRestore.x,
        props.scrollStateToRestore.y,
      );
    }

    setStatus({ type: props.navigationType, value: false });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // eat
    } else {
      console.error(error);
      setStatus({ type: props.navigationType, value: false });
    }
  }
}

// Take in a custom stringifier for the body, or build in devalue?
// Build in Ky?
// Make this take generics

async function submit(
  url: string | URL,
  requestInit?: RequestInit,
): Promise<
  | {
      success: true;
      response: Response;
    }
  | { success: false; error: string }
> {
  setStatus({ type: "submission", value: true });

  const abortControllerKey = url + (requestInit?.method || "");
  const { abortController, didAbort } =
    handleAbortController(abortControllerKey);

  const urlToUse = new URL(url, window.location.origin);
  urlToUse.searchParams.set(`${HWY_PREFIX}json`, "1");

  try {
    const response = await handleRedirects({
      abortController,
      url: urlToUse,
      requestInit,
    });

    abortControllers.delete(abortControllerKey);

    if (
      response &&
      (String(response?.status).startsWith("4") ||
        String(response?.status).startsWith("5"))
    ) {
      setStatus({ type: "submission", value: false });

      return {
        success: false,
        error: String(response.status),
      } as const;
    }

    const isMethodGet = requestInit?.method?.toLowerCase() === "get";

    if (didAbort) {
      if (!isMethodGet) {
        // revalidate
        await internalNavigate({
          href: location.href,
          navigationType: "revalidation",
        }); // this shuts off loading indicator too
      }

      return {
        success: false,
        error: "Aborted",
      } as const;
    } else {
      if (!response?.ok) {
        return {
          success: false,
          error: response?.status ? String(response.status) : "Unknown",
        } as const;
      }

      if (!isMethodGet) {
        // HWY __TODO This should probably be a specific endpoint, otherwise this might fail if the page doesn't exist anymore
        // __TODO need to remind myself why this is here specifically
        await internalNavigate({
          href: location.href,
          navigationType: "buildIDCheck",
        });
      }

      setStatus({ type: "submission", value: false });
    }

    return {
      success: true,
      response,
    } as const;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // eat
      return {
        success: false,
        error: "Aborted",
      } as const;
    } else {
      console.error(error);
      setStatus({ type: "submission", value: false });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as const;
    }
  }
}

async function reRenderApp({
  json,
  navigationType,
}: {
  json: any;
  navigationType: NavigationType;
}) {
  // Changing the title instantly makes it feel faster
  document.title = json.title;

  const oldList = hwyClientGlobal.get("activePaths");
  const newList = json.activePaths;

  let updatedList: {
    importPath: string;
    type: "new" | "same";
  }[] = [];

  // compare and populate updatedList
  for (let i = 0; i < Math.max(oldList.length, newList.length); i++) {
    if (i < oldList.length && i < newList.length && oldList[i] === newList[i]) {
      updatedList.push({
        importPath: oldList[i],
        type: "same",
      });
    } else if (i < newList.length) {
      updatedList.push({
        importPath: newList[i],
        type: "new",
      });
    }
  }

  // get new components only
  const components = updatedList.map((x: any) => {
    if (x.type === "new") {
      return import(("." + x.importPath).replace("public/dist/", ""));
    }
    return undefined;
  });
  const awaitedComps = await Promise.all(components);
  const awaitedDefaults = awaitedComps.map((x) => (x ? x.default : undefined));

  // placeholder list based on old list
  let newActiveComps = hwyClientGlobal.get("activeComponents");

  // replace stale components with new ones where applicable
  for (let i = 0; i < awaitedDefaults.length; i++) {
    if (awaitedDefaults[i]) {
      newActiveComps[i] = awaitedDefaults[i];
    }
  }

  // delete any remaining stale components
  if (oldList.length > newList.length) {
    newActiveComps = newActiveComps.slice(0, newList.length);
  }

  // NOW ACTUALLY SET EVERYTHING
  hwyClientGlobal.set("activeComponents", newActiveComps);

  const identicalKeysToSet = [
    "activeErrorBoundaries",
    "activeData",
    "activePaths",
    "outermostErrorBoundaryIndex",
    "splatSegments",
    "params",
    "adHocData",
    "buildID",
  ] as const satisfies ReadonlyArray<(typeof CLIENT_GLOBAL_KEYS)[number]>;

  for (const key of identicalKeysToSet) {
    hwyClientGlobal.set(key, json[key]);
  }

  if (navigationType !== "revalidation") {
    hwyClientGlobal.set("actionData", json.actionData);
  }

  let highestIndex: number | undefined;
  if (navigationType !== "revalidation") {
    for (let i = 0; i < updatedList.length; i++) {
      if (updatedList[i].type === "new") {
        highestIndex = i;
        break;
      }
    }
  } else {
    for (let i = 0; i < (json.actionData as any[]).length; i++) {
      if (json.actionData[i] !== undefined) {
        highestIndex = i;
        break;
      }
    }
  }

  // dispatch event
  const event = new CustomEvent("hwy:route-change", {
    detail: { index: highestIndex ?? 0 },
  });
  window.dispatchEvent(event);

  removeAllBetween("meta");
  addBlocksToHead("meta", json.metaHeadBlocks);
  removeAllBetween("rest");
  addBlocksToHead("rest", json.restHeadBlocks);
}

//////////////////////////////
// head stuff

function getStartAndEndElements(type: "meta" | "rest") {
  const startElement = document.head.querySelector(
    `[data-hwy="${type}-start"]`,
  );
  const endElement = document.head.querySelector(`[data-hwy="${type}-end"]`);
  return { startElement, endElement };
}

function removeAllBetween(type: "meta" | "rest") {
  const { startElement, endElement } = getStartAndEndElements(type);
  if (!startElement || !endElement) {
    return;
  }

  let currentElement = startElement.nextSibling as HTMLElement | null;

  while (currentElement && currentElement !== endElement) {
    const nextElement = currentElement.nextSibling;
    currentElement.remove();
    currentElement = nextElement as HTMLElement | null;
  }
}

function addBlocksToHead(type: "meta" | "rest", blocks: Array<any>) {
  const { startElement, endElement } = getStartAndEndElements(type);
  if (!startElement || !endElement) {
    return;
  }

  blocks.forEach((block) => {
    let newElement: HTMLElement | null = null;

    if (block.title) {
      newElement = document.createElement("title");
      newElement.textContent = block.title;
    } else if (block.tag) {
      newElement = document.createElement(block.tag);
      if (block.attributes) {
        Object.keys(block.attributes).forEach((key) => {
          newElement?.setAttribute(key, block.attributes[key]);
        });
      }
    }

    if (newElement) {
      document.head.insertBefore(newElement, endElement);
    }
  });
}

async function navigate(href: string, options?: { replace?: boolean }) {
  await internalNavigate({
    href,
    navigationType: "userNavigation",
    replace: options?.replace,
  });
}

function getCustomHistory() {
  return customHistory;
}
function getIsNavigating() {
  return isNavigating;
}
function getIsRevalidating() {
  return isRevalidating;
}
function getIsSubmitting() {
  return isSubmitting;
}
export {
  getCustomHistory,
  getIsInternalLink,
  getIsNavigating,
  getIsRevalidating,
  getIsSubmitting,
  getShouldPreventLinkDefault,
  initReactClient,
  navigate,
  submit,
};
// __TODO -- return a revalidation function (consider not auto-revalidating)
