import {
  HeadBlock,
  HeadFunction,
  RouteData,
  TagHeadBlock,
} from "../../../common/index.mjs";
import { getPublicUrl } from "./hashed-public-url.js";

function stableHash(obj: Record<string, any>): string {
  return JSON.stringify(
    Object.keys(obj)
      .sort()
      .reduce(
        (result, key) => {
          result[key] = obj[key];
          return result;
        },
        {} as Record<string, any>,
      ),
  );
}

function dedupeHeadBlocks(headBlocks: HeadBlock[]): HeadBlock[] {
  const results = new Map<any, HeadBlock>();

  for (let i = 0; i < headBlocks.length; i++) {
    const block = headBlocks[i];

    if ("title" in block) {
      results.set("title", block);
    } else if (block.tag === "meta") {
      const name = block.attributes.name;
      if (name === "description") {
        results.set("description", block);
      } else {
        results.set(stableHash(block), block);
      }
    } else {
      results.set(stableHash(block), block);
    }
  }

  return [...results.values()];
}

function getExportedHeadBlocks(
  props: Pick<RouteData, "activePathData" | "event" | "defaultHeadBlocks">,
): HeadBlock[] {
  const { activePathData } = props;

  const nonDeduped =
    activePathData?.activeHeads?.flatMap((head: HeadFunction, i) => {
      const currentActivePath = activePathData?.activePaths?.[i];

      if (!currentActivePath) {
        return [];
      }

      const currentData = activePathData?.activeData?.[i];

      return head({
        loaderData: currentData,
        actionData: activePathData.actionData,
        event: props.event,
        params: activePathData?.matchingPaths?.[i].params,
        splatSegments: activePathData?.matchingPaths?.[i].splatSegments,
      });
    }) ?? [];

  const defaults = props.defaultHeadBlocks ?? [];

  const heads = [...defaults, ...nonDeduped];

  return dedupeHeadBlocks(heads);
}

function getSiblingClientHeadBlocks(
  props: Pick<RouteData, "activePathData">,
): TagHeadBlock[] {
  return (
    props.activePathData.matchingPaths
      ?.filter((x) => {
        return x.hasSiblingClientFile;
      })
      .map((x) => {
        return {
          tag: "script",
          attributes: {
            type: "module",
            src: getPublicUrl(
              "dist/" + x.importPath.replace(".page.js", ".client.js"),
            ),
          },
        };
      }) ?? []
  );
}

export { getExportedHeadBlocks, getSiblingClientHeadBlocks };
