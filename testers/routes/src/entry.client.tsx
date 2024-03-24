import { initReactClient } from "@hwy-js/client";
import { RootOutlet } from "hwy";
import React from "react";
import { hydrateRoot } from "react-dom/client";

await initReactClient(() => {
  hydrateRoot(
    document.querySelector("main") as HTMLElement,
    <React.StrictMode>
      <RootOutlet
        fallbackErrorBoundary={function ErrorBoundary() {
          return <div>Error Boundary in Root</div>;
        }}
      />
    </React.StrictMode>,
  );
});
