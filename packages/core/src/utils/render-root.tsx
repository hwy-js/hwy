import type { Context, Next } from "hono";
import { getMatchingPathData } from "../router/get-matching-path-data.js";
import { type JSX } from "preact";
import { renderToString } from "preact-render-to-string";
import { getPublicUrl } from "./hashed-public-url.js";
import type { HeadBlock } from "../types.js";
import { getHeadBlocks } from "../components/head-elements.js";
import { get_hwy_global } from "./get-hwy-global.js";
import {
  type BaseProps,
  HWY_PREFIX,
  sort_head_blocks,
} from "../../../common/index.mjs";

async function renderRoot({
  c,
  next,
  defaultHeadBlocks,
  root: Root,
}: {
  c: Context;
  next: Next;
  defaultHeadBlocks?: HeadBlock[];
  root: (baseProps: BaseProps) => JSX.Element;
}) {
  const activePathData = await getMatchingPathData({ c });

  if (activePathData.fetchResponse) {
    return activePathData.fetchResponse;
  }

  if (!activePathData.matchingPaths?.length) {
    return await next();
  }

  const IS_PREACT = get_hwy_global().get("mode") === "preact-mpa";

  if (IS_PREACT) {
    const IS_JSON = Boolean(c.req.query()[`${HWY_PREFIX}json`]);

    if (IS_JSON) {
      const baseProps = { c, activePathData, defaultHeadBlocks };

      if (c.req.raw.signal.aborted) {
        return;
      }

      const headBlocks = getHeadBlocks(baseProps);
      const { title, metaHeadBlocks, restHeadBlocks } =
        sort_head_blocks(headBlocks);

      return c.json({
        title,
        metaHeadBlocks,
        restHeadBlocks,
        activeData: activePathData.activeData,
        activePaths: activePathData.matchingPaths?.map((x) => {
          return getPublicUrl(
            "dist/" + x.importPath.slice(0, -3) + ".hydrate.js",
          );
        }),
        outermostErrorBoundaryIndex: activePathData.outermostErrorBoundaryIndex,
        errorToRender: activePathData.errorToRender,
        splatSegments: activePathData.splatSegments,
        params: activePathData.params,
        actionData: activePathData.actionData,
      });
    }
  }

  const base_props = { c, activePathData, defaultHeadBlocks };
  const markup = <Root {...base_props} />;
  return c.html("<!doctype html>" + renderToString(markup));
}

export { renderRoot };
