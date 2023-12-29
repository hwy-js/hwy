import { initPreactClient } from "@hwy-js/client";

await initPreactClient({
  hydrateWith: <div>Hydrating...</div>,
  elementToHydrate: document.querySelector("main") as HTMLElement,
});
