import type { Context } from "hono";
import { getMatchingPathData } from "../router/get-matching-path-data.js";
import type { HeadFunction, HeadBlock } from "../types.js";

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
      const name = block.props.name;
      const property = block.props.property;

      const META_KEY_PREFIX = "__meta__";

      if (name) {
        results.set(META_KEY_PREFIX + name, block);
      } else if (property) {
        results.set(META_KEY_PREFIX + property, block);
      } else {
        results.set(stable_hash(block), block);
      }
    } else {
      results.set(stable_hash(block), block);
    }
  }

  return [...results.values()];
}

type HeadProps = {
  activePathData: Awaited<ReturnType<typeof getMatchingPathData>>;
  c: Context;
  defaultHeadBlocks?: HeadBlock[];
};

function get_head_blocks_array(props: HeadProps): HeadBlock[] {
  const { activePathData: active_path_data } = props;

  console.log({ activeHeads: active_path_data?.activeHeads });

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

function get_new_title(props: HeadProps): string | undefined {
  const head_blocks = get_head_blocks_array(props);
  const title_block = head_blocks.find((x) => "title" in x);
  return (title_block as any)?.title;
}

function HeadElements(props: HeadProps) {
  const head_blocks = get_head_blocks_array(props);

  return (
    <>
      {head_blocks.map((block, i) => {
        if ("title" in block) {
          return <title>{block.title}</title>;
        } else {
          // @ts-ignore
          return <block.tag {...block.props} />;
        }
      })}
    </>
  );
}

export { HeadElements, get_new_title };
