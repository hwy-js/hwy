import {
  CRITICAL_CSS_ELEMENT_ID,
  LIVE_REFRESH_SSE_PATH,
  getHwyGlobal,
} from "../../../common/index.mjs";
import { DEV_BUNDLED_CSS_LINK } from "./hashed-public-url.js";

const hwyGlobal = getHwyGlobal();

function getShouldUseRefresh() {
  return hwyGlobal.get("isDev");
}

const getRefreshScript = (timeoutInMs = 150) => {
  if (!getShouldUseRefresh()) {
    return "";
  }
  return `
  const es = new EventSource("${LIVE_REFRESH_SSE_PATH}");
	es.addEventListener("message", (e) => {
    const { changeType, criticalCss } = JSON.parse(e.data);
    function refresh() {
      if (changeType === "css-bundle") {
        for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
          const url = new URL(link.href);
          if (
            url.host === location.host &&
            url.pathname.startsWith("/public/dist/standard-bundled.")
          ) {
            const next = link.cloneNode();
            next.href = "${DEV_BUNDLED_CSS_LINK}";
            next.onload = () => link.remove();
            link.parentNode?.insertBefore(next, link.nextSibling);
          }
        }
      } else if (changeType === "critical-css") {
        const inlineStyleEl = document.getElementById("${CRITICAL_CSS_ELEMENT_ID}");
        if (inlineStyleEl) {
          inlineStyleEl.innerHTML = criticalCss;
        }
      } else {
        setTimeout(() => window.location.reload(), ${timeoutInMs});
      }
    }
    refresh();
  });
	es.addEventListener("error", (e) => {
		console.log("SSE error", e);
		es.close();
		setTimeout(() => window.location.reload(), ${timeoutInMs});
	});
	window.addEventListener("beforeunload", () => {
		es.close();
	});
  `.trim();
};

export { getRefreshScript };
