import { hydrate } from "preact";
import { PreactApp } from "./preact-app.js";

/* This file runs on the client only */

hydrate(<PreactApp />, document.querySelector("body") as HTMLElement);
