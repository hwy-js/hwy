import { SPLAT_SEGMENT } from "../../../common/index.mjs";
import { getMatchStrength } from "./get-match-strength.js";
import { makeWouterMatcher } from "./make-wouter-matcher.js";

const wouterMatcher = makeWouterMatcher();

function matcher({ pattern, path }: { pattern: string; path: string }) {
  const result1 = wouterMatcher(pattern + `/${SPLAT_SEGMENT}`, path);
  const result2 = wouterMatcher(pattern + "/:catch?", path);
  const strength = getMatchStrength({ pattern, path });

  const params = result1[1];
  if ("catch" in params) delete params["catch"];

  return {
    path,
    pattern,
    matches: result1[0] || result2[0],
    params,
    ...strength,
  };
}

export { matcher };
