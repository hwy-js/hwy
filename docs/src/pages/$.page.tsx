import type { PageProps } from "hwy";
import { RenderedMarkdown } from "../components/rendered_markdown.js";
import { CatchallLoader } from "./$.server.js";

export default function (props: PageProps<CatchallLoader>) {
  return <RenderedMarkdown grayMatterObj={props.loaderData} />;
}
