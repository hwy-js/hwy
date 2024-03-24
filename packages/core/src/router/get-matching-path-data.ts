import { H3Event, getRequestURL } from "h3";
import {
  ActivePathData,
  DataProps,
  HWY_PREFIX,
  Paths,
  SPLAT_SEGMENT,
  getHwyGlobal,
} from "../../../common/index.mjs";
import { ROOT_DIRNAME } from "../setup.js";
import { dynamicNodePath, pathToFileURLStr } from "../utils/url-polyfills.js";
import { getMatchStrength } from "./get-match-strength.js";
import { getMatchingPathsInternal } from "./get-matching-path-data-internal.js";
import { matcher } from "./matcher.js";

const hwyGlobal = getHwyGlobal();

async function getPath(importPath: string) {
  const routeStrategy = hwyGlobal.get("hwyConfig").routeStrategy;

  const arbitraryGlobal = (globalThis as any)[Symbol.for(HWY_PREFIX)];

  if (!arbitraryGlobal) {
    (globalThis as any)[Symbol.for(HWY_PREFIX)] = {};
  }

  let localPath = arbitraryGlobal["./" + importPath];

  // If "bundle" this should definitely be true
  // If "warm-cache-at-startup" or "lazy-once-then-cache", this might be true
  // If "always-lazy", this should definitely be false
  if (localPath) {
    return localPath;
  }

  const inner = dynamicNodePath?.join(
    hwyGlobal.get("testDirname") || ROOT_DIRNAME || "./",
    importPath,
  );

  if (routeStrategy === "always-lazy") {
    return import(pathToFileURLStr(inner));
  }

  localPath = await import(pathToFileURLStr(inner));

  arbitraryGlobal["./" + importPath] = localPath;

  return localPath;
}

function fullyDecoratePaths({
  matchingPaths,
  splatSegments,
}: {
  matchingPaths: ReturnType<typeof semiDecoratePaths>;
  splatSegments: string[];
}) {
  return (
    matchingPaths?.map((localPath) => {
      const serverImportPath =
        !localPath.isServerFile && hwyGlobal.get("hwyConfig").useDotServerFiles
          ? localPath.importPath.replace(".page.js", ".server.js")
          : localPath.importPath;

      const noServerFns =
        hwyGlobal.get("hwyConfig").useDotServerFiles &&
        !localPath.hasSiblingServerFile &&
        !localPath.isServerFile;

      const noClientFns = localPath.isServerFile;

      // public
      return {
        hasSiblingClientFile: localPath.hasSiblingClientFile,
        hasSiblingServerFile: localPath.hasSiblingServerFile,
        isServerFile: localPath.isServerFile,
        importPath: localPath.importPath,
        params: localPath.params,
        pathType: localPath.pathType,
        splatSegments: splatSegments,

        // ON CLIENT
        componentImporter: async () => {
          if (noClientFns) return;

          try {
            const imported = await getPath(localPath.importPath);
            return imported.default;
          } catch (e) {
            console.error(e);
            throw e;
          }
        },

        errorBoundaryImporter: async () => {
          if (noClientFns) return;

          try {
            const imported = await getPath(localPath.importPath);
            return imported.ErrorBoundary ? imported.ErrorBoundary : undefined;
          } catch (e) {
            console.error(e);
            throw e;
          }
        },

        // REST ON SERVER
        headImporter: async () => {
          if (noServerFns) return () => [];

          try {
            const imported = await getPath(serverImportPath);
            return imported.head ? imported.head : () => [];
          } catch (e) {
            console.error(e);
            throw e;
          }
        },

        loader: async (loaderArgs: DataProps) => {
          if (noServerFns) return;

          try {
            const imported = await getPath(serverImportPath);
            return imported.loader ? imported.loader(loaderArgs) : undefined;
          } catch (e) {
            return handleCaughtMaybeResponse(e);
          }
        },

        action: async (actionArgs: DataProps) => {
          if (noServerFns) return;

          try {
            const imported = await getPath(serverImportPath);
            return imported.action ? imported.action(actionArgs) : undefined;
          } catch (e) {
            return handleCaughtMaybeResponse(e);
          }
        },
      };
    }) ?? []
  );
}

type SemiDecoratedPath = Paths[number] & {
  pattern: string;
  matches: boolean;
  params: Record<string, string>;
} & ReturnType<typeof getMatchStrength>;

function semiDecoratePaths({
  event,
  paths,
}: {
  event: H3Event;
  paths: Paths;
}): SemiDecoratedPath[] {
  let pathToUse = getRequestURL(event).pathname;
  if (pathToUse !== "/" && pathToUse.endsWith("/")) {
    pathToUse = pathToUse.slice(0, -1);
  }
  return paths?.map((path) => {
    return {
      // public shape
      ...path,
      ...matcher({
        pattern: path.path,
        path: pathToUse,
      }),
      pathType:
        path.path === `/${SPLAT_SEGMENT}` ? "ultimate-catch" : path.pathType,
    };
  });
}

type FullyDecoratedPath = ReturnType<typeof fullyDecoratePaths>[number];

async function getActionData({
  event,
  lastPath,
}: {
  event: H3Event;
  lastPath: FullyDecoratedPath;
}) {
  try {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(event.method)) {
      return await lastPath?.action?.({
        event,
        params: lastPath?.params,
        splatSegments: lastPath?.splatSegments,
      });
    }
  } catch (e) {
    return handleCaughtMaybeResponse(e);
  }
}

async function getMatchingPathData(event: H3Event) {
  const paths = hwyGlobal.get("paths");

  if (!paths) {
    throw new Error("Paths not found.");
  }

  const semiDecoratedPaths = semiDecoratePaths({
    event,
    paths,
  });

  const { paths: matchingPaths, splatSegments } =
    getMatchingPathsInternal(semiDecoratedPaths);

  const activePaths = matchingPaths?.map((path) => path.pattern);

  let fullyDecoratedMatchingPaths = fullyDecoratePaths({
    matchingPaths,
    splatSegments,
  });

  const lastPath =
    fullyDecoratedMatchingPaths?.[fullyDecoratedMatchingPaths.length - 1];

  const params = lastPath?.params;

  let actionData: any;
  let actionDataError: any;

  try {
    actionData = await getActionData({ event, lastPath });
  } catch (e) {
    actionDataError = e;
  }

  if (actionData instanceof Response && lastPath.isServerFile) {
    return { fetchResponse: actionData };
  }

  let [activeComponents] = await Promise.all([
    Promise.all(
      (fullyDecoratedMatchingPaths || [])?.map((path) => {
        return path?.componentImporter();
      }),
    ),
  ]);

  let [activeDataObj, activeHeads, activeErrorBoundaries] = await Promise.all([
    Promise.all(
      fullyDecoratedMatchingPaths.map(async (path) => {
        return path
          ?.loader?.({
            event,
            params,
            splatSegments: splatSegments,
          })
          .then((result) => ({ error: undefined, result }))
          .catch((error) => {
            if (error instanceof Response) {
              return { result: error, error: undefined };
            }
            console.error("Loader error:", error);
            return { error, result: undefined };
          });
      }),
    ),

    Promise.all(
      (fullyDecoratedMatchingPaths || []).map((path) => {
        return path?.headImporter();
      }),
    ),

    Promise.all(
      (fullyDecoratedMatchingPaths || []).map((path) => {
        return path?.errorBoundaryImporter();
      }),
    ),
  ]);

  const errors = activeDataObj.map((item) => item.error);
  const activeData = activeDataObj.map((item) => item.result);

  const thereAreErrors = Boolean(
    actionDataError || errors.some((error) => error),
  );

  let outermostErrorIndex = errors?.findIndex((error) => error);

  if (actionDataError) {
    const actionDataErrorIndex = activeDataObj.length - 1;

    if (thereAreErrors && actionDataErrorIndex < outermostErrorIndex) {
      outermostErrorIndex = actionDataErrorIndex;
    }
  }

  let closestParentErrorBoundaryIndex;

  if (
    thereAreErrors &&
    outermostErrorIndex !== undefined &&
    outermostErrorIndex !== -1
  ) {
    closestParentErrorBoundaryIndex = activeErrorBoundaries
      .slice(0, outermostErrorIndex + 1)
      .reverse()
      .findIndex((boundary) => boundary != null);

    if (closestParentErrorBoundaryIndex !== -1) {
      closestParentErrorBoundaryIndex =
        outermostErrorIndex - closestParentErrorBoundaryIndex;
    }

    if (
      closestParentErrorBoundaryIndex !== undefined &&
      closestParentErrorBoundaryIndex !== -1
    ) {
      const closestParentErrorBoundary =
        activeErrorBoundaries[closestParentErrorBoundaryIndex];
      activeComponents = [
        ...activeComponents.slice(0, closestParentErrorBoundaryIndex),
        closestParentErrorBoundary,
      ];
    }
  }

  const responses = [
    ...activeData,
    ...(actionData ? [actionData] : []),
  ]?.filter((data) => data instanceof Response);

  if (responses.length) {
    return {
      fetchResponse: responses[responses.length - 1] as Response,
    };
  }

  if (thereAreErrors) {
    const errorPayload = {
      // not needed in recursive component
      matchingPaths: fullyDecoratedMatchingPaths.slice(
        0,
        outermostErrorIndex + 1, // adding one because it's still an active path, we just only want boundary
      ),
      activeHeads: activeHeads.slice(0, outermostErrorIndex),

      // needed in recursive component
      activeData: activeData.slice(0, outermostErrorIndex), // loader data for active routes
      activePaths: activePaths.slice(
        0,
        outermostErrorIndex + 1, // adding one because it's still an active path, we just only want boundary
      ),
      outermostErrorBoundaryIndex: closestParentErrorBoundaryIndex,
      splatSegments: splatSegments,
      params,
      actionData: fullyDecoratedMatchingPaths
        .slice(0, outermostErrorIndex)
        .map((x) => {
          return null;
        }),
      activeComponents: activeComponents.slice(0, outermostErrorIndex), // list of import paths for active routes
      activeErrorBoundaries: activeErrorBoundaries.slice(
        0,
        outermostErrorIndex + 1,
      ),
    } satisfies ActivePathData;

    return errorPayload;
  }

  return {
    // not needed in recursive component
    matchingPaths: fullyDecoratedMatchingPaths,
    activeHeads,

    // needed in recursive component
    activeData, // loader data for active routes
    activePaths,
    outermostErrorBoundaryIndex: closestParentErrorBoundaryIndex,
    splatSegments: splatSegments,
    params,
    actionData: fullyDecoratedMatchingPaths?.map((x) => {
      return x.importPath === lastPath?.importPath ? actionData : null;
    }),
    activeComponents, // list of import paths for active routes
    activeErrorBoundaries,
  } satisfies ActivePathData;
}

function handleCaughtMaybeResponse(e: any) {
  if (e instanceof Response) {
    return e;
  }
  console.error(e);
  throw e;
}

export { getMatchingPathData };
export type { SemiDecoratedPath };
