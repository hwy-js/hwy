import { SPLAT_SEGMENT } from "../../../common/index.mjs";

export function getMatchStrength({
  pattern,
  path,
}: {
  pattern: string;
  path: string;
}) {
  const patternSegments = pattern.split("/").filter(Boolean);
  const realSegments = path.split("/").filter(Boolean);

  let score = 0;

  for (let i = 0; i < patternSegments.length; i++) {
    if (patternSegments[i] === realSegments[i]) {
      // literal match
      score = score + 3;
      continue;
    }

    if (patternSegments[i] === SPLAT_SEGMENT) {
      // catch-all match
      score = score + 1;
      continue;
    }

    if (patternSegments[i].startsWith(":")) {
      // named dynamic segment match
      score = score + 2;
      continue;
    }

    return {
      score: 0,
      realSegmentsLength: realSegments.length,
    };
  }

  return {
    score,
    realSegmentsLength: realSegments.length,
  };
}
