import { initReactClient } from "@hwy-js/client";
import { RootOutlet } from "hwy";
import React from "react";
import { hydrateRoot } from "react-dom/client";
import { RootLayout } from "./pages/layout.js";

await initReactClient(() => {
  hydrateRoot(
    document.getElementById("root") as HTMLElement,
    <React.StrictMode>
      <RootOutlet
        fallbackErrorBoundary={() => <div>Something went wrong.</div>}
        layout={RootLayout}
      />
    </React.StrictMode>,
  );
});
