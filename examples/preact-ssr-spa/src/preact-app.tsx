import { useState } from "preact/hooks";
import { Router, Route, Link, useLocation } from "wouter-preact";

/* This file runs on the server and the client */

function PreactApp({ path }: { path?: string }) {
  const [count, setCount] = useState(0);

  return (
    <Router ssrPath={path}>
      <div id="app-root">
        <h1>Welcome to Hwy!</h1>

        <Nav />

        <Route path="/">
          <h2>Home</h2>

          <button onClick={() => setCount((count) => count + 1)}>
            I have been clicked {count} time{count === 1 ? "" : "s"}
          </button>
        </Route>

        <Route path="/about">
          <h2>About</h2>

          <p>
            This is a Hwy app in "Preact SPA" mode. It is server-side rendered
            only on the initial page load. After that, it is hydrated with
            Preact, and your client-side router of choice takes over from that
            point on (in this case, Wouter).
          </p>
        </Route>
      </div>
    </Router>
  );
}

function Nav() {
  const [location] = useLocation(); // This hook must be called inside "Router" component

  return (
    <nav>
      <Link href="/" class={location === "/" ? "active" : ""}>
        Home
      </Link>

      <Link href="/about" class={location === "/about" ? "active" : ""}>
        About
      </Link>
    </nav>
  );
}

export { PreactApp };
