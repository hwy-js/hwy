import {
  CLIENT_GLOBAL_KEYS,
  HWY_PREFIX,
  RouteData,
  getHwyGlobal,
} from "../../../common/index.mjs";
import { getPublicUrl } from "./hashed-public-url.js";

const hwyGlobal = getHwyGlobal();

const { uneval } = await import("devalue");

export function getSsrInnerHtml(routeData: RouteData) {
  let html = `
globalThis[Symbol.for("${HWY_PREFIX}")] = {};
const x = globalThis[Symbol.for("${HWY_PREFIX}")];
x.isDev = ${uneval(hwyGlobal.get("isDev"))};
${mkSetterStr("buildID", routeData.buildID)}
${mkSetterStr("activeData", routeData.activePathData.activeData)}
${mkSetterStr(
  "activePaths",
  routeData.activePathData.matchingPaths?.map((x) => {
    return getPublicUrl("dist/" + x.importPath);
  }),
)}
${mkSetterStr(
  "outermostErrorBoundaryIndex",
  routeData.activePathData.outermostErrorBoundaryIndex,
)}
${mkSetterStr("splatSegments", routeData.activePathData.splatSegments)}
${mkSetterStr("params", routeData.activePathData.params)}
${mkSetterStr("actionData", routeData.activePathData.actionData)}
${mkSetterStr("adHocData", routeData.adHocData)}
`.trim();
  return html;
}

function mkSetterStr(key: (typeof CLIENT_GLOBAL_KEYS)[number], value: any) {
  return `x.${key}=${uneval(value)};`;
}
