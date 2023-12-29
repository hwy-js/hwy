import { Context } from "hono";

import {
  ActivePathData,
  DataProps,
  HWY_PREFIX,
  Paths,
  SPLAT_SEGMENT,
  get_hwy_global,
} from "../../../common/index.mjs";
import { get_match_strength } from "./get-match-strength.js";
import { get_matching_paths_internal } from "./get-matching-path-data-internal.js";
import { matcher } from "./matcher.js";

import { ROOT_DIRNAME } from "../setup.js";
import { get_is_json_request } from "../utils/get-root-data.js";
import { node_path, path_to_file_url_string } from "../utils/url-polyfills.js";

const hwy_global = get_hwy_global();

async function get_path(import_path: string) {
  const route_strategy = hwy_global.get("hwy_config").routeStrategy;

  const arbitrary_global = (globalThis as any)[Symbol.for(HWY_PREFIX)];

  if (!arbitrary_global) {
    (globalThis as any)[Symbol.for(HWY_PREFIX)] = {};
  }

  let _path = arbitrary_global["./" + import_path];

  // If "bundle" this should definitely be true
  // If "warm-cache-at-startup" or "lazy-once-then-cache", this might be true
  // If "always-lazy", this should definitely be false
  if (_path) {
    return _path;
  }

  const inner = node_path?.join(
    hwy_global.get("test_dirname") || ROOT_DIRNAME || "./",
    import_path,
  );

  if (route_strategy === "always-lazy") {
    return import(path_to_file_url_string(inner));
  }

  _path = await import(path_to_file_url_string(inner));

  arbitrary_global["./" + import_path] = _path;

  return _path;
}

function fully_decorate_paths({
  matching_paths,
  splat_segments,
}: {
  matching_paths: ReturnType<typeof semi_decorate_paths>;
  splat_segments: string[];
}) {
  return (
    matching_paths?.map((_path) => {
      const server_import_path =
        !_path.isServerFile && hwy_global.get("hwy_config").useDotServerFiles
          ? _path.importPath.replace(".page.js", ".server.js")
          : _path.importPath;

      const NO_SERVER_FUNCTIONS =
        hwy_global.get("hwy_config").useDotServerFiles &&
        !_path.hasSiblingServerFile &&
        !_path.isServerFile;

      const NO_CLIENT_FUNCTIONS = _path.isServerFile;

      // public
      return {
        hasSiblingClientFile: _path.hasSiblingClientFile,
        hasSiblingServerFile: _path.hasSiblingServerFile,
        isServerFile: _path.isServerFile,
        importPath: _path.importPath,
        params: _path.params,
        pathType: _path.pathType,
        splatSegments: splat_segments,

        // ON CLIENT
        componentImporter: async () => {
          if (NO_CLIENT_FUNCTIONS) return;

          try {
            const imported = await get_path(_path.importPath);
            return imported.default;
          } catch (e) {
            console.error(e);
            throw e;
          }
        },

        fallbackImporter: async () => {
          if (NO_CLIENT_FUNCTIONS) return;

          try {
            const imported = await get_path(_path.importPath);
            return imported.Fallback ? imported.Fallback : undefined;
          } catch (e) {
            console.error(e);
            throw e;
          }
        },

        errorBoundaryImporter: async () => {
          if (NO_CLIENT_FUNCTIONS) return;

          try {
            const imported = await get_path(_path.importPath);
            return imported.ErrorBoundary ? imported.ErrorBoundary : undefined;
          } catch (e) {
            console.error(e);
            throw e;
          }
        },

        // REST ON SERVER
        headImporter: async () => {
          if (NO_SERVER_FUNCTIONS) return () => [];

          try {
            const imported = await get_path(server_import_path);
            return imported.head ? imported.head : () => [];
          } catch (e) {
            console.error(e);
            throw e;
          }
        },

        loader: async (loaderArgs: DataProps) => {
          if (NO_SERVER_FUNCTIONS) return;

          try {
            const imported = await get_path(server_import_path);
            return imported.loader ? imported.loader(loaderArgs) : undefined;
          } catch (e) {
            return handle_caught_maybe_response(e);
          }
        },

        action: async (actionArgs: DataProps) => {
          if (NO_SERVER_FUNCTIONS) return;

          try {
            const imported = await get_path(server_import_path);
            return imported.action ? imported.action(actionArgs) : undefined;
          } catch (e) {
            return handle_caught_maybe_response(e);
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
} & ReturnType<typeof get_match_strength>;

function semi_decorate_paths({
  c,
  paths,
}: {
  c: Context;
  paths: Paths;
}): SemiDecoratedPath[] {
  return paths?.map((path) => {
    let path_to_use = c.req.path;

    if (path_to_use !== "/" && path_to_use.endsWith("/")) {
      path_to_use = path_to_use.slice(0, -1);
    }

    return {
      // public shape
      ...path,
      ...matcher({
        pattern: path.path,
        path: path_to_use,
      }),
      pathType:
        path.path === `/${SPLAT_SEGMENT}` ? "ultimate-catch" : path.pathType,
    };
  });
}

type FullyDecoratedPath = ReturnType<typeof fully_decorate_paths>[number];

async function get_action_data({
  c,
  last_path,
}: {
  c: Context;
  last_path: FullyDecoratedPath;
}) {
  try {
    if (c.req.method !== "GET") {
      return await last_path?.action?.({
        c,
        params: last_path?.params,
        splatSegments: last_path?.splatSegments,
      });
    }
  } catch (e) {
    return handle_caught_maybe_response(e);
  }
}

async function getMatchingPathData({ c }: { c: Context }) {
  const paths = hwy_global.get("paths");

  if (!paths) {
    throw new Error("Paths not found.");
  }

  const semi_decorated_paths = semi_decorate_paths({
    c,
    paths,
  });

  const { paths: matching_paths, splat_segments } =
    get_matching_paths_internal(semi_decorated_paths);

  const active_paths = matching_paths?.map((path) => path.pattern);

  let fully_decorated_matching_paths = fully_decorate_paths({
    matching_paths,
    splat_segments,
  });

  const last_path =
    fully_decorated_matching_paths?.[fully_decorated_matching_paths.length - 1];

  const params = last_path?.params;

  let action_data: any;
  let action_data_error: any;

  try {
    action_data = await get_action_data({ c, last_path });
  } catch (e) {
    action_data_error = e;
  }

  if (action_data instanceof Response && last_path.isServerFile) {
    return { fetchResponse: action_data };
  }

  let [active_components, active_fallbacks] = await Promise.all([
    Promise.all(
      (fully_decorated_matching_paths || [])?.map((path) => {
        return path?.componentImporter();
      }),
    ),

    Promise.all(
      (fully_decorated_matching_paths || [])?.map((path) => {
        return path?.fallbackImporter();
      }),
    ),
  ]);

  let first_fallback_index = active_fallbacks.findIndex((x) => x);

  const is_json_request = get_is_json_request({ c });

  if (is_json_request) {
    first_fallback_index = -1;
  }

  if (first_fallback_index !== -1) {
    active_components = [
      ...active_components.slice(0, first_fallback_index),
      active_fallbacks[first_fallback_index],
    ];

    fully_decorated_matching_paths.splice(first_fallback_index + 1);

    active_paths.splice(first_fallback_index + 1);
  }

  let [active_data_obj, active_heads, active_error_boundaries] =
    await Promise.all([
      Promise.all(
        (first_fallback_index === -1
          ? fully_decorated_matching_paths || []
          : fully_decorated_matching_paths?.slice(
              0,
              fully_decorated_matching_paths.length - 1,
            )
        ).map(async (path) => {
          return path
            ?.loader?.({
              c,
              params,
              splatSegments: splat_segments,
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
        (fully_decorated_matching_paths || []).map((path) => {
          return path?.headImporter();
        }),
      ),

      Promise.all(
        (fully_decorated_matching_paths || []).map((path) => {
          return path?.errorBoundaryImporter();
        }),
      ),
    ]);

  const errors = active_data_obj.map((item) => item.error);
  const active_data = active_data_obj.map((item) => item.result);

  const there_are_errors = Boolean(
    action_data_error || errors.some((error) => error),
  );

  let outermost_error_index = errors?.findIndex((error) => error);

  if (action_data_error) {
    const action_data_error_index = active_data_obj.length - 1;

    if (there_are_errors && action_data_error_index < outermost_error_index) {
      outermost_error_index = action_data_error_index;
    }
  }

  let closest_parent_error_boundary_index;

  if (
    there_are_errors &&
    outermost_error_index !== undefined &&
    outermost_error_index !== -1
  ) {
    closest_parent_error_boundary_index = active_error_boundaries
      .slice(0, outermost_error_index + 1)
      .reverse()
      .findIndex((boundary) => boundary != null);

    if (closest_parent_error_boundary_index !== -1) {
      closest_parent_error_boundary_index =
        outermost_error_index - closest_parent_error_boundary_index;
    }

    if (
      closest_parent_error_boundary_index !== undefined &&
      closest_parent_error_boundary_index !== -1
    ) {
      const closest_parent_error_boundary =
        active_error_boundaries[closest_parent_error_boundary_index];
      active_components = [
        ...active_components.slice(0, closest_parent_error_boundary_index),
        closest_parent_error_boundary,
      ];
    }
  }

  const responses = [
    ...active_data,
    ...(action_data ? [action_data] : []),
  ]?.filter((data) => data instanceof Response);

  if (responses.length) {
    return {
      fetchResponse: responses[responses.length - 1] as Response,
    };
  }

  if (there_are_errors) {
    const error_payload = {
      // not needed in recursive component
      matchingPaths: fully_decorated_matching_paths.slice(
        0,
        outermost_error_index + 1, // adding one because it's still an active path, we just only want boundary
      ),
      activeHeads: active_heads.slice(0, outermost_error_index),
      fallbackIndex: first_fallback_index,

      // needed in recursive component
      activeData: active_data.slice(0, outermost_error_index), // loader data for active routes
      activePaths: active_paths.slice(
        0,
        outermost_error_index + 1, // adding one because it's still an active path, we just only want boundary
      ),
      outermostErrorBoundaryIndex: closest_parent_error_boundary_index,
      splatSegments: splat_segments,
      params,
      actionData: fully_decorated_matching_paths
        .slice(0, outermost_error_index)
        .map((x) => {
          return null;
        }),
      activeComponents: active_components.slice(0, outermost_error_index), // list of import paths for active routes
      activeErrorBoundaries: active_error_boundaries.slice(
        0,
        outermost_error_index + 1,
      ),
    } satisfies ActivePathData;

    return error_payload;
  }

  return {
    // not needed in recursive component
    matchingPaths: fully_decorated_matching_paths,
    activeHeads: active_heads,
    fallbackIndex: first_fallback_index,

    // needed in recursive component
    activeData: active_data, // loader data for active routes
    activePaths: active_paths,
    outermostErrorBoundaryIndex: closest_parent_error_boundary_index,
    splatSegments: splat_segments,
    params,
    actionData: fully_decorated_matching_paths?.map((x) => {
      return x.importPath === last_path?.importPath ? action_data : null;
    }),
    activeComponents: active_components, // list of import paths for active routes
    activeErrorBoundaries: active_error_boundaries,
  } satisfies ActivePathData;
}

function handle_caught_maybe_response(e: any) {
  if (e instanceof Response) {
    return e;
  }
  console.error(e);
  throw e;
}

export { getMatchingPathData };
export type { SemiDecoratedPath };
