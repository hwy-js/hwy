import { SPLAT_SEGMENT } from "../../../common/index.mjs";
import type { SemiDecoratedPath } from "./get-matching-path-data.js";

export function getMatchingPathsInternal(pathsArg: Array<SemiDecoratedPath>) {
  let paths = pathsArg.filter((x) => {
    // only continue if the path matches
    if (!x.matches) {
      return false;
    }

    // if it's dash route (home), no need to compare segments length
    if (x.realSegmentsLength === 0) {
      return true;
    }

    const indexAdjustedRealSegmentsLength =
      x.pathType === "index" ? x.realSegmentsLength + 1 : x.realSegmentsLength;

    // make sure any remaining matches are not longer than the path itself
    const shouldMoveOn = x.segments.length <= indexAdjustedRealSegmentsLength;

    if (!shouldMoveOn) {
      return false;
    }

    // now we need to remove ineligible indices
    if (x.pathType !== "index") {
      // if not an index, then you're already confirmed good
      return true;
    }

    const truthySegmentsLength = x.segments.filter(Boolean).length;

    const pathSegmentsLength = x.path.split("/").filter(Boolean).length;

    if (truthySegmentsLength === pathSegmentsLength) {
      return true;
    }

    return false;
  });

  // if there are multiple matches, filter out the ultimate catch-all
  if (paths.length > 1) {
    paths = paths.filter((x) => x.pathType !== "ultimate-catch");
  }

  let splatSegments: string[] = [];

  // if only one match now, return it
  if (paths.length === 1) {
    if (paths[0].pathType === "ultimate-catch") {
      splatSegments = paths[0].path.split("/").filter(Boolean);
    }

    return {
      splatSegments,
      paths,
    };
  }

  // now we only have real child paths

  // these are essentially any matching static layout routes
  const definiteMatches = paths.filter((x) => x.pathType === "static-layout");

  const highestScoresBySegmentLengthOfDefiniteMatches =
    getHighestScoresBySegmentLength(definiteMatches);

  // the "maybe matches" need to compete with each other
  // they also need some more complicated logic
  const groupedBySegmentLength: Record<number, SemiDecoratedPath[]> = {};

  for (const x of paths) {
    if (x.pathType !== "static-layout") {
      const segmentLength = x.segments.length;

      const highestScoreForThisSegmentLength =
        highestScoresBySegmentLengthOfDefiniteMatches[segmentLength];

      if (
        highestScoreForThisSegmentLength === undefined ||
        x.score > highestScoreForThisSegmentLength
      ) {
        if (!groupedBySegmentLength[segmentLength]) {
          groupedBySegmentLength[segmentLength] = [];
        }
        groupedBySegmentLength[segmentLength].push(x);
      }
    }
  }

  const sortedGroupedBySegmentLength = Object.entries(groupedBySegmentLength)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([_, paths]) => paths);

  const xformedMaybes: SemiDecoratedPath[] = [];

  let wildcardSplat: SemiDecoratedPath | null = null;

  for (const paths of sortedGroupedBySegmentLength) {
    let winner = paths[0];

    let highestScore = winner.score;
    let indexCandidate: SemiDecoratedPath | null = null;

    for (const path of paths) {
      if (
        path.pathType === "index" &&
        path.realSegmentsLength < path.segments.length
      ) {
        if (indexCandidate) {
          if (path.score > indexCandidate.score) {
            indexCandidate = path;
          }
        } else {
          indexCandidate = path;
        }
      }

      if (path.score > highestScore) {
        highestScore = path.score;
        winner = path;
      }
    }

    if (indexCandidate) {
      winner = indexCandidate;
    }

    const splat = paths.find((x) => x.pathType === "non-ultimate-splat");

    if (splat) {
      if (!wildcardSplat || splat.score > wildcardSplat.score) {
        wildcardSplat = splat;
      }

      splatSegments = getSplatSegmentsFromWinningPath(winner);
    }

    // ok, problem
    // in the situation where we have a dynamic folder name with an index file within,
    // we need to make sure that other static-layout paths win over it
    // that's what this code is for

    const winnerIsDynamicIndex = Boolean(
      winner.pathType === "index" && winner.segments.at(-2)?.startsWith(":"),
    );

    const definiteMatchesShouldOverride =
      winnerIsDynamicIndex &&
      Boolean(
        definiteMatches.find((x) => {
          const a = x.pathType === "static-layout";
          const b = x.realSegmentsLength === winner.realSegmentsLength;
          const c = x.segments.at(-1) !== winner.segments.at(-2);
          const d = x.score > winner.score;
          return a && b && c && d;
        }),
      );

    if (!definiteMatchesShouldOverride) {
      xformedMaybes.push(winner);
    }
  }

  let maybeFinalPaths = [...definiteMatches, ...xformedMaybes].sort(
    (a, b) => a.segments.length - b.segments.length,
  );

  // if anything left
  if (maybeFinalPaths.length) {
    const lastPath = maybeFinalPaths[maybeFinalPaths.length - 1];

    // get index-adjusted segments length
    const lastPathSegmentsLengthConstructive =
      lastPath.pathType === "index"
        ? lastPath.segments.length - 1
        : lastPath.segments.length;

    const splatIsTooFarOut =
      lastPathSegmentsLengthConstructive > lastPath.realSegmentsLength;

    const splatIsNeeded =
      lastPathSegmentsLengthConstructive < lastPath.realSegmentsLength;

    const isNotASplat = lastPath.pathType !== "non-ultimate-splat";

    const weNeedADifferentSplat =
      splatIsTooFarOut || (splatIsNeeded && isNotASplat);

    if (weNeedADifferentSplat && wildcardSplat) {
      maybeFinalPaths[maybeFinalPaths.length - 1] = wildcardSplat;

      splatSegments = getSplatSegmentsFromWinningPath(wildcardSplat);
    }

    if (weNeedADifferentSplat && !wildcardSplat) {
      return {
        splatSegments: paths[0].path.split("/").filter(Boolean),
        paths: pathsArg.filter(
          (x) => x.matches && x.pathType === "ultimate-catch",
        ),
      };
    }
  }

  // if a dynamic layout is adjacent and before an index, we need to remove it
  // IF the index does not share the same dynamic segment
  for (let i = 0; i < maybeFinalPaths.length; i++) {
    const current = maybeFinalPaths[i];
    const next = maybeFinalPaths[i + 1];

    if (current.pathType === "dynamic-layout" && next?.pathType === "index") {
      const currentDynamicSegment = current.segments.at(-1);
      const nextDynamicSegment = next.segments.at(-2);

      if (currentDynamicSegment !== nextDynamicSegment) {
        maybeFinalPaths.splice(i, 1);
      }
    }
  }

  return {
    splatSegments,
    paths: maybeFinalPaths,
  };
}

function getHighestScoresBySegmentLength(matches: SemiDecoratedPath[]) {
  return matches.reduce(
    (acc, x) => {
      const segmentLength = x.segments.length;
      if (acc[segmentLength] == null || x.score > acc[segmentLength]) {
        acc[segmentLength] = x.score;
      }
      return acc;
    },
    {} as Record<number, number>,
  );
}

function getSplatSegmentsFromWinningPath(winner: SemiDecoratedPath) {
  const data = winner.path.split("/").filter(Boolean);

  const numOfNonSplatSegments = winner.segments.filter((x) => {
    return x !== SPLAT_SEGMENT;
  }).length;

  const numOfSplatSegments = data.length - numOfNonSplatSegments;

  return data.slice(data.length - numOfSplatSegments, data.length);
}
