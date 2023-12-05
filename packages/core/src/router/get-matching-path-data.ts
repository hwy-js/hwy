import path from "node:path";
import type { Context } from "hono";
import { matcher } from "../router/matcher.js";
import type { Paths } from "@hwy-js/build";
import { ROOT_DIRNAME } from "../setup.js";
import { get_matching_paths_internal } from "./get-matching-path-data-internal.js";
import { get_match_strength } from "./get-match-strength.js";
import type { DataProps } from "../types.js";
import { path_to_file_url_string } from "../utils/url-polyfills.js";
import { get_hwy_global } from "../utils/get-hwy-global.js";
import { SPLAT_SEGMENT } from "../../../common/index.mjs";

const hwy_global = get_hwy_global();

async function get_path(import_path: string) {
  const route_strategy = hwy_global.get("route_strategy");

  let _path = (globalThis as any)["./" + import_path];

  // If "bundle" this should definitely be true
  // If "warm-cache-at-startup" or "lazy-once-then-cache", this might be true
  // If "always-lazy", this should definitely be false
  if (_path) {
    return _path;
  }

  const inner = path.join(
    hwy_global.get("test_dirname") || ROOT_DIRNAME || "./",
    import_path,
  );

  if (route_strategy === "always-lazy") {
    return import(path_to_file_url_string(inner));
  }

  _path = await import(path_to_file_url_string(inner));

  (globalThis as any)["./" + import_path] = _path;

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
      // public
      return {
        hasSiblingClientFile: _path.hasSiblingClientFile,
        importPath: _path.importPath,
        params: _path.params,
        pathType: _path.pathType,
        splatSegments: splat_segments,
        componentImporter: async () => {
          try {
            const imported = await get_path(_path.importPath);
            return imported.default;
          } catch (e) {
            console.error(e);
            throw e;
          }
        },
        errorBoundaryImporter: async () => {
          try {
            const imported = await get_path(_path.importPath);
            return imported.ErrorBoundary ? imported.ErrorBoundary : undefined;
          } catch (e) {
            console.error(e);
            throw e;
          }
        },
        headImporter: async () => {
          try {
            const imported = await get_path(_path.importPath);
            return imported.head ? imported.head : () => [];
          } catch (e) {
            console.error(e);
            throw e;
          }
        },
        loader: async (loaderArgs: DataProps) => {
          try {
            const imported = await get_path(_path.importPath);
            return imported.loader ? imported.loader(loaderArgs) : undefined;
          } catch (e) {
            return handle_caught_maybe_response(e);
          }
        },
        action: async (actionArgs: DataProps) => {
          try {
            const imported = await get_path(_path.importPath);
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

  const fully_decorated_matching_paths = fully_decorate_paths({
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

  let [
    active_data_obj,
    active_components,
    active_heads,
    active_error_boundaries,
  ] = await Promise.all([
    Promise.all(
      (fully_decorated_matching_paths || [])?.map(async (path) => {
        return path
          ?.loader?.({
            c,
            params,
            splatSegments: splat_segments,
          })
          .then((result) => ({ error: undefined, result }))
          .catch((error) => {
            if (error instanceof Response)
              return { result: error, error: undefined };
            console.error("Loader error:", error);
            return { error, result: undefined };
          });
      }),
    ),

    Promise.all(
      (fully_decorated_matching_paths || [])?.map((path) => {
        return path?.componentImporter();
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

  let highest_error_index = errors?.findIndex((error) => error);

  if (action_data_error) {
    highest_error_index = active_data_obj.length - 1;
  }

  let closest_parent_error_boundary_index;

  if (
    there_are_errors &&
    highest_error_index !== undefined &&
    highest_error_index !== -1
  ) {
    closest_parent_error_boundary_index = active_error_boundaries
      .slice(0, highest_error_index + 1)
      .reverse()
      .findIndex((boundary) => boundary != null);

    if (closest_parent_error_boundary_index !== -1) {
      closest_parent_error_boundary_index =
        highest_error_index - closest_parent_error_boundary_index;
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
      fetchResponse: responses[responses.length - 1],
    };
  }

  const should_render_loader_error =
    highest_error_index < active_data_obj.length - 1 ||
    (highest_error_index === active_data_obj.length - 1 && !action_data_error);

  const error_to_render = should_render_loader_error
    ? errors[highest_error_index]
    : action_data_error;

  return {
    matchingPaths: fully_decorated_matching_paths,
    activeData: active_data,
    actionData: action_data,
    activePaths: active_paths,
    activeComponents: active_components,
    activeHeads: active_heads,
    errorToRender: error_to_render,
    activeErrorBoundaries: active_error_boundaries,
    params,
    splatSegments: splat_segments,
    outermostErrorBoundaryIndex: closest_parent_error_boundary_index,
  };
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
