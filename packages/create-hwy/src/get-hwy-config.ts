import { DEFAULT_PORT, type HwyConfig } from "../../common/index.mjs";
import type { Options } from "../index.js";

function get_hwy_config(options: Options) {
  let obj: HwyConfig = {
    deploymentTarget: options.deployment_target,
  };

  if (options.deployment_target !== "cloudflare-pages") {
    obj.dev = {
      port: DEFAULT_PORT,
    };
  }

  if (options.css_preference === "tailwind") {
    obj.dev = {
      ...obj.dev,
      watchExclusions: ["src/styles/tw-input.css"],
    };
  }

  let text = `export default ${JSON.stringify(obj, null, 2)}`;

  if (options.lang_preference === "typescript") {
    text =
      `import type { HwyConfig } from "@hwy-js/build";\n\n` +
      text +
      ` satisfies HwyConfig;`;
  } else {
    text = `/** @type {import('@hwy-js/build').HwyConfig} */\n` + text + ";";
  }

  return text.trim() + "\n";
}

export { get_hwy_config };
