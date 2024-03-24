import type { H3Event } from "h3";
import type { FunctionComponent, ReactElement } from "react";

export const HWY_PREFIX = "__hwy_internal__";
export const HWY_SYMBOL = Symbol.for(HWY_PREFIX);
export const LIVE_REFRESH_SSE_PATH = `/${HWY_PREFIX}live_refresh_sse`;
export const LIVE_REFRESH_RPC_PATH = `/${HWY_PREFIX}live_refresh_rpc`;

export type HwyConfig = {
  scriptsToInject?: Array<string>;
  dev?: {
    watchExclusions?: Array<string>;
    watchInclusions?: Array<string>;
    hotReloadStyles?: boolean;
  };
} & (
  | {
      /**
       * @experimental
       * `useClientSideReact` is experimental.
       */
      useClientSideReact?: false;
      /**
       * @experimental
       * `useDotServerFiles` is experimental.
       */
      useDotServerFiles?: boolean;
    }
  | {
      /**
       * @experimental
       * `useClientSideReact` is experimental.
       */
      useClientSideReact?: true;
      /**
       * @experimental
       * `useDotServerFiles` is experimental.
       */
      useDotServerFiles?: true;
    }
) & {
    routeStrategy?:
      | "bundle"
      | "warm-cache-at-startup"
      | "always-lazy"
      | "lazy-once-then-cache";
  };

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

export const CLIENT_GLOBAL_KEYS = [
  "activeData",
  "activePaths",
  "outermostErrorBoundaryIndex",
  "splatSegments",
  "params",
  "actionData",
  "activeComponents",
  "activeErrorBoundaries",
  "adHocData",
  "buildID",
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
  splatSegments: string[];
  params: Record<string, string>;
  actionData: any[];
  activeComponents: any[];
  activeErrorBoundaries: any[];
};

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

export function getHeadBlockType(headBlock: HeadBlock): BlockType | "unknown" {
  if ("title" in headBlock) {
    return "title";
  }
  if (BLOCK_TYPES.includes(headBlock.tag as BlockType)) {
    return headBlock.tag as BlockType;
  }
  return "unknown";
}

export function sortHeadBlocks(headBlocks: HeadBlock[]) {
  let title = "";
  let metaHeadBlocks: Array<TagHeadBlock> = [];
  let restHeadBlocks: Array<TagHeadBlock> = [];

  headBlocks.forEach((block) => {
    const type = getHeadBlockType(block);

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

export interface AdHocData extends Record<string, any> {}

export type RouteData = {
  event: H3Event;
  activePathData: ActivePathData;
  defaultHeadBlocks: HeadBlock[];
  title: string;
  metaHeadBlocks: TagHeadBlock[];
  restHeadBlocks: TagHeadBlock[];
  adHocData: AdHocData | undefined;
  buildID: string;
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
  isServerFile: boolean;
};

export type Paths = Array<Path>;

// HWY GLOBAL (SERVER)

export type HwyGlobal = {
  hwyConfig: HwyConfig;
  isDev: boolean;
  criticalBundledCSS: string;
  paths: Paths;
  publicMap: Record<string, string>;
  publicReverseMap: Record<string, string>;
  testDirname?: string;
  injectedScripts: Array<string>;
  buildID: string;
};

export type HwyGlobalKey = keyof HwyGlobal;

export const HWY_GLOBAL_KEYS: { [K in keyof HwyGlobal]: any } = {
  hwyConfig: "",
  isDev: "",
  criticalBundledCSS: "",
  paths: "",
  publicMap: "",
  publicReverseMap: "",
  injectedScripts: "",
  buildID: "",
} as const;

for (const key in HWY_GLOBAL_KEYS) {
  HWY_GLOBAL_KEYS[key as HwyGlobalKey] = HWY_PREFIX + key;
}

export function getHwyGlobal() {
  const dangerousGlobalThis = globalThis as any;

  if (!dangerousGlobalThis[HWY_SYMBOL]) {
    dangerousGlobalThis[HWY_SYMBOL] = {};
  }

  function get<K extends HwyGlobalKey>(key: K) {
    return dangerousGlobalThis[HWY_SYMBOL][HWY_PREFIX + key] as HwyGlobal[K];
  }

  function set<K extends HwyGlobalKey, V extends HwyGlobal[K]>(
    key: K,
    value: V,
  ) {
    dangerousGlobalThis[HWY_SYMBOL][HWY_PREFIX + key] = value;
  }

  return { get, set };
}

///////////////////////////////////
// CLIENT GLOBAL
///////////////////////////////////

export function getHwyClientGlobal() {
  const dangerousGlobalThis = globalThis as any;

  function get<K extends HwyClientGlobalKey>(key: K) {
    return dangerousGlobalThis[HWY_SYMBOL][key] as HwyClientGlobal[K];
  }

  function set<K extends HwyClientGlobalKey, V extends HwyClientGlobal[K]>(
    key: K,
    value: V,
  ) {
    dangerousGlobalThis[HWY_SYMBOL][key] = value;
  }

  return { get, set };
}

// CORE TYPES

export type DataProps = {
  event: H3Event;
  params: Record<string, string>;
  splatSegments: string[];
};

export type Loader = (args: DataProps) => Promise<any> | any;
export type Action = (args: DataProps) => Promise<any> | any;

type NotResponse<T> = T extends Response ? never : T;

export type PageProps<
  LoaderType extends Loader = Loader,
  ActionType extends Action = Action,
> = {
  loaderData: NotResponse<Awaited<ReturnType<LoaderType>>>;
  actionData: NotResponse<Awaited<ReturnType<ActionType>>> | undefined;
  Outlet: FunctionComponent;
  params: Record<string, string>;
  splatSegments: string[];
  adHocData: AdHocData | undefined;
};

export type PageComponent<
  LoaderType extends Loader = Loader,
  ActionType extends Action = Action,
> = (props: PageProps<LoaderType, ActionType>) => ReactElement;

export type HeadProps<
  LoaderType extends Loader = Loader,
  ActionType extends Action = Action,
> = Omit<PageProps<LoaderType, ActionType>, "Outlet" | "adHocData"> & {
  event: H3Event;
};

export type HeadFunction<
  LoaderType extends Loader = Loader,
  ActionType extends Action = Action,
> = (props: HeadProps<LoaderType, ActionType>) => Array<HeadBlock>;

export type RootLayoutProps = { children: ReactElement } & Pick<
  PageProps,
  "params" | "splatSegments" | "adHocData"
>;
export type RootLayoutComponent = FunctionComponent<RootLayoutProps>;
