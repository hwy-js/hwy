import matter from "gray-matter";
import type { DataProps, HeadProps } from "hwy";
import fs from "node:fs/promises";
import path from "node:path";
import { MdObj } from "../components/rendered_markdown.js";

export function head(props: HeadProps<CatchallLoader>) {
  let title = "Hwy";
  if (props.loaderData.data.title) {
    title = title + " | " + props.loaderData.data.title;
  }
  return { title };
}

export async function loader(ctx: DataProps): Promise<MdObj> {
  try {
    const providedPath = ctx.splatSegments.join("/");
    let normalizedPath = path.normalize(providedPath);
    if (normalizedPath == ".") {
      normalizedPath = "README";
    }
    const filePath = `./markdown/${normalizedPath}.md`;
    const str = await fs.readFile(filePath, "utf-8");
    const gmObj = matter(str);
    return { data: gmObj.data, content: gmObj.content };
  } catch (e) {
    return { data: { title: "Error" }, content: `# 404\n\nNothing found.` };
  }
}

export type CatchallLoader = typeof loader;
