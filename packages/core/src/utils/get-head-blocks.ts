import {
  HeadBlock,
  HeadFunction,
  RouteData,
  TagHeadBlock,
} from "../../../common/index.mjs";
import { getPublicUrl } from "./hashed-public-url.js";

function stable_hash(obj: Record<string, any>): string {
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

function dedupe_head_blocks(head_blocks: HeadBlock[]): HeadBlock[] {
  const results = new Map<any, HeadBlock>();

  for (let i = 0; i < head_blocks.length; i++) {
    const block = head_blocks[i];

    if ("title" in block) {
      results.set("title", block);
    } else if (block.tag === "meta") {
      const name = block.attributes.name;
      if (name === "description") {
        results.set("description", block);
      } else {
        results.set(stable_hash(block), block);
      }
    } else {
      results.set(stable_hash(block), block);
    }
  }

  return [...results.values()];
}

function getExportedHeadBlocks(
  props: Pick<RouteData, "activePathData" | "c" | "defaultHeadBlocks">,
): HeadBlock[] {
  const { activePathData: active_path_data } = props;

  const non_deduped =
    active_path_data?.activeHeads?.flatMap((head: HeadFunction, i) => {
      const current_active_path = active_path_data?.activePaths?.[i];

      if (!current_active_path) {
        return [];
      }

      const current_data = active_path_data?.activeData?.[i];

      return head({
        loaderData: current_data,
        actionData: active_path_data.actionData,
        c: props.c,
        params: active_path_data?.matchingPaths?.[i].params,
        splatSegments: active_path_data?.matchingPaths?.[i].splatSegments,
        path: current_active_path,
      });
    }) ?? [];

  const defaults = props.defaultHeadBlocks ?? [];

  const heads = [...defaults, ...non_deduped];

  return dedupe_head_blocks(heads);
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
              "dist/pages/" + x.importPath.replace(".js", ".client.js"),
            ),
          },
        };
      }) ?? []
  );
}

export { getExportedHeadBlocks, getSiblingClientHeadBlocks };
