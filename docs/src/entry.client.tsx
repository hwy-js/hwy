import { initPreactClient } from "@hwy-js/client";
import { done, start } from "nprogress";
import { BodyInner } from "./components/body-inner.js";

await initPreactClient({
  elementToHydrate: document.querySelector("body") as HTMLElement,
  hydrateWith: <BodyInner />,
  onLoadStart: start,
  onLoadEnd: done,
});
