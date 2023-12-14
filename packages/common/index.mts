import type { Context, Env } from "hono";
import { FunctionComponent, JSX } from "preact";

export const HWY_PREFIX = "__hwy_internal__";
export const LIVE_REFRESH_SSE_PATH = `/${HWY_PREFIX}live_refresh_sse`;
export const LIVE_REFRESH_RPC_PATH = `/${HWY_PREFIX}live_refresh_rpc`;

export const DEFAULT_PORT = 3000;

type CloudflarePages = "cloudflare-pages";
type NonCloudflarePages =
  | "bun"
  | "vercel-lambda"
  | "node"
  | "deno-deploy"
  | "deno";

export type DeploymentTarget = NonCloudflarePages | CloudflarePages;

export type HwyConfig = {
  scriptsToInject?: Array<string>;
  dev?: {
    port?: number;
    watchExclusions?: Array<string>;
    hotReloadCssBundle?: boolean;
  };
  usePreactCompat?: boolean;
} & (
  | { hydrateRouteComponents?: false; useDotServerFiles: boolean }
  | { hydrateRouteComponents: true; useDotServerFiles: true }
) &
  (
    | {
        deploymentTarget: NonCloudflarePages;
        routeStrategy?:
          | "bundle"
          | "warm-cache-at-startup"
          | "always-lazy"
          | "lazy-once-then-cache";
      }
    | {
        deploymentTarget: "cloudflare-pages";
        routeStrategy?: "bundle";
      }
  );

export const SPLAT_SEGMENT = ":catch*";

export type RefreshFilePayload = {
  changeType: "critical-css" | "css-bundle" | "standard";
  criticalCss?: string;
  at: string;
};

export const CRITICAL_CSS_ELEMENT_ID = "data-hwy-critical-css";

/***************************************
 * Client global
 **************************************/

export const CLIENT_SIGNAL_KEYS = [
  "activeData",
  "activePaths",
  "outermostErrorBoundaryIndex",
  "errorToRender",
  "splatSegments",
  "params",
  "actionData",
  "activeComponents",
  "activeErrorBoundaries",
] as const;

export const OTHER_CLIENT_KEYS = [
  "globalOnLoadStart",
  "globalOnLoadEnd",
] as const;

export const CLIENT_GLOBAL_KEYS = [
  ...CLIENT_SIGNAL_KEYS,
  ...OTHER_CLIENT_KEYS,
] as const;

export type HwyClientGlobal = Partial<{
  [K in (typeof CLIENT_GLOBAL_KEYS)[number]]: any;
}>;

export type HwyClientGlobalKey = keyof HwyClientGlobal;

/***************************************
 * Hwy Types
 * ************************************/

export type ActivePathData = {
  // not needed in recursive component
  matchingPaths?: any[];
  activeHeads: any[];

  // needed in recursive component
  activeData: any[];
  activePaths: string[];
  outermostErrorBoundaryIndex: number | undefined;
  errorToRender: any;
  splatSegments: string[];
  params: Record<string, string>;
  actionData: any[];
  activeComponents: any[];
  activeErrorBoundaries: any[];
};

export type ErrorBoundaryProps = {
  error: unknown;
  splatSegments: string[];
  params: Record<string, string>;
};

type PermissiveStringArray = Array<string> | ReadonlyArray<string>;

export type ClientModuleDef = {
  names: PermissiveStringArray;
  external?: PermissiveStringArray;
} & ({ code: string } | { pathsFromRoot: PermissiveStringArray });

export type ClientModuleDefs =
  | Array<ClientModuleDef>
  | ReadonlyArray<ClientModuleDef>;

///////////////////////////////////////////////
// Head Block stuff

export type TitleHeadBlock = { title: string };
export type TagHeadBlock = {
  tag: "meta" | "base" | "link" | "style" | "script" | "noscript" | string;
  attributes: Partial<Record<string, string>>;
};
export type HeadBlock = TitleHeadBlock | TagHeadBlock;

const BLOCK_TYPES = [
  "title",
  "meta",
  "base",
  "link",
  "style",
  "script",
  "noscript",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export function get_head_block_type(
  head_block: HeadBlock,
): BlockType | "unknown" {
  if ("title" in head_block) {
    return "title";
  }
  if (BLOCK_TYPES.includes(head_block.tag as BlockType)) {
    return head_block.tag as BlockType;
  }
  return "unknown";
}

export function sort_head_blocks(head_blocks: HeadBlock[]) {
  let title = "";
  let metaHeadBlocks: Array<TagHeadBlock> = [];
  let restHeadBlocks: Array<TagHeadBlock> = [];

  head_blocks.forEach((block) => {
    const type = get_head_block_type(block);

    if (type === "title") {
      title = (block as TitleHeadBlock).title;
    } else if (type === "meta") {
      metaHeadBlocks.push(block as TagHeadBlock);
    } else {
      restHeadBlocks.push(block as TagHeadBlock);
    }
  });

  return {
    title,
    metaHeadBlocks,
    restHeadBlocks,
  };
}

export type BaseProps<EnvType extends Env = {}> = {
  c: Context<EnvType>;
  activePathData: ActivePathData;
  defaultHeadBlocks?: HeadBlock[];
};

// PATHS

export type PathType =
  | "ultimate-catch"
  | "index"
  | "static-layout"
  | "dynamic-layout"
  | "non-ultimate-splat";

export type Path = {
  importPath: string;
  path: string;
  segments: Array<string | null>;
  pathType: PathType;
  hasSiblingClientFile: boolean;
  hasSiblingServerFile: boolean;
};

export type Paths = Array<Path>;

// HWY GLOBAL (SERVER)

export type HwyGlobal = {
  hwy_config: HwyConfig;
  is_dev: boolean;
  critical_bundled_css: string;
  paths: Paths;
  public_map: Record<string, string>;
  public_reverse_map: Record<string, string>;
  test_dirname?: string;
  import_map_setup: any;
  injected_scripts: Array<string>;
};

export type HwyGlobalKey = keyof HwyGlobal;

export const HWY_GLOBAL_KEYS: { [K in keyof HwyGlobal]: any } = {
  hwy_config: "",
  is_dev: "",
  critical_bundled_css: "",
  paths: "",
  public_map: "",
  public_reverse_map: "",
  import_map_setup: "",
  injected_scripts: "",
} as const;

for (const key in HWY_GLOBAL_KEYS) {
  HWY_GLOBAL_KEYS[key as HwyGlobalKey] = HWY_PREFIX + key;
}

export function get_hwy_global() {
  const global_this = globalThis as any;

  function get<K extends HwyGlobalKey>(key: K) {
    return global_this[HWY_PREFIX + key] as HwyGlobal[K];
  }

  function set<K extends HwyGlobalKey, V extends HwyGlobal[K]>(
    key: K,
    value: V,
  ) {
    global_this[HWY_PREFIX + key] = value;
  }

  return { get, set };
}

// CORE TYPES

export type DataProps<EnvType extends Env = {}> = {
  c: Context<EnvType>;
  params: Record<string, string>;
  splatSegments: string[];
};

export type Loader<EnvType extends Env = {}> = (
  args: DataProps<EnvType>,
) => Promise<any> | any;

export type Action<EnvType extends Env = {}> = (
  args: DataProps<EnvType>,
) => Promise<any> | any;

export type PageProps<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
> = {
  loaderData: Awaited<ReturnType<LoaderType>>;
  actionData: Awaited<ReturnType<ActionType>> | undefined;
  Outlet: FunctionComponent<Record<string, any>>;
  params: Record<string, string>;
  splatSegments: string[];
  path: string;
};

export type PageComponent<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
> = (props: PageProps<LoaderType, ActionType>) => JSX.Element;

export type HeadProps<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
  EnvType extends Env = {},
> = Omit<PageProps<LoaderType, ActionType>, "Outlet"> & {
  c: Context<EnvType>;
};

export type HeadFunction<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
  EnvType extends Env = {},
> = (props: HeadProps<LoaderType, ActionType, EnvType>) => Array<HeadBlock>;
