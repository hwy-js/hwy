import { fromHighlighter } from "@shikijs/markdown-it/core";
import MarkdownIt from "markdown-it";
import { getHighlighterCore } from "shiki/core";

const highlighter = await getHighlighterCore({
  themes: [import("shiki/themes/vitesse-dark.mjs")],
  langs: [
    import("shiki/langs/tsx.mjs"),
    import("shiki/langs/bash.mjs"),
    import("shiki/langs/jsonc.mjs"),
  ],
  loadWasm: import("shiki/wasm"),
});

const md = MarkdownIt({ html: true });

md.use(fromHighlighter(highlighter as any, { theme: "vitesse-dark" }));

type AnyObj = { [key: string]: any };
export type MdObj = { data: AnyObj; content: string };

export function RenderedMarkdown({ grayMatterObj }: { grayMatterObj: MdObj }) {
  let html = grayMatterObj.data.title
    ? `<h1>${grayMatterObj.data.title}</h1>`
    : "";

  html += grayMatterObj.content ? md.render(grayMatterObj.content) : "";

  return (
    <div
      className="content-section revert-padding markdown"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
