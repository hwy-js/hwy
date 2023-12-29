import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import inquirer from "inquirer";
import { fileURLToPath } from "node:url";
import { get_package_json } from "./src/get-package-json.js";
import { get_tailwind_config } from "./src/get-tailwind-config.js";
import { get_ts_config } from "./src/get-tsconfig.js";
import { get_readme } from "./src/get-readme.js";
import { get_main } from "./src/get-main.js";
import { get_gitignore } from "./src/get-gitignore.js";
import { get_client_entry } from "./src/get-client-entry.js";
import { get_is_target_deno } from "./src/utils.js";
import { format } from "prettier";
import { DeploymentTarget } from "../common/index.mjs";
import { get_hwy_config } from "./src/get-hwy-config.js";
import { get_css_hooks_setup } from "./src/get-css-hooks-setup.js";
import { LATEST_HWY_VERSION } from "./src/waterfall-maps.js";

type Options = {
  project_name: string;
  css_preference: "vanilla" | "tailwind" | "css-hooks";
  deployment_target: DeploymentTarget;
  client_lib: "htmx" | "preact";
  with_nprogress: boolean;
};

function dirname_from_import_meta(import_meta_url: string) {
  return path.dirname(fileURLToPath(import_meta_url));
}

const deployment_choices = [
  "Node",
  "Vercel (Lambda)",
  "Cloudflare Pages",
  "Bun",
  "Deno",
  "Deno Deploy",
] as const;

const css_choices = ["Vanilla", "Tailwind", "CSS Hooks"] as const;
const client_lib_choices = ["htmx", "preact"] as const;

type Prompts = Parameters<(typeof inquirer)["prompt"]>[0];

const prompts = [
  {
    type: "",
    name: "new_dir_name",
    message: `Enter a name for your project's new directory:`,
    prefix: "\n",
    validate: (dirname: string) => {
      const invalidCharacters = /[<>:"\/\\|?*\x00-\x1F ]/;
      return !!dirname && !invalidCharacters.test(dirname);
    },
  },
  {
    type: "list",
    name: "client_lib_choice",
    message: `Choose your client library:`,
    choices: client_lib_choices,
    prefix: "\n",
  },
  {
    type: "list",
    name: "css_choice",
    message: `Choose a styling solution:`,
    choices: css_choices,
    prefix: "\n",
  },
  {
    type: "list",
    name: "deployment_target",
    message: `Choose a deployment target (easy to change later):`,
    choices: deployment_choices,
    prefix: "\n",
  },
  {
    type: "confirm",
    name: "nprogress",
    message: "Should we add NProgress?",
    default: false,
    prefix: "\n",
  },
] satisfies Prompts;

async function ask_questions(): Promise<
  | {
      new_dir_name: string;
      client_lib_choice: (typeof client_lib_choices)[number];
      css_choice: (typeof css_choices)[number];
      deployment_target: (typeof deployment_choices)[number];
      nprogress: boolean;
    }
  | undefined
> {
  try {
    return await inquirer.prompt(prompts);
  } catch (error) {
    console.error("\nError:", error);
  }
}

function get_options(
  choices: NonNullable<Awaited<ReturnType<typeof ask_questions>>>,
) {
  return {
    project_name: choices.new_dir_name,
    with_nprogress: choices.nprogress,
    client_lib: choices.client_lib_choice === "htmx" ? "htmx" : "preact",
    css_preference:
      choices.css_choice === "Tailwind"
        ? "tailwind"
        : choices.css_choice === "CSS Hooks"
          ? "css-hooks"
          : "vanilla",
    deployment_target:
      choices.deployment_target === "Vercel (Lambda)"
        ? "vercel-lambda"
        : choices.deployment_target === "Deno Deploy"
          ? "deno-deploy"
          : choices.deployment_target === "Deno"
            ? "deno"
            : choices.deployment_target === "Bun"
              ? "bun"
              : choices.deployment_target === "Cloudflare Pages"
                ? "cloudflare-pages"
                : "node",
  } satisfies Options;
}

async function main() {
  const choices = await ask_questions();

  if (!choices) {
    console.log("\nSomething went wrong! Please file an issue.\n");
    return;
  }

  const options = get_options(choices);

  console.log("\nWorking...");

  try {
    const new_dir_path = path.join(process.cwd(), choices.new_dir_name);

    const dir_already_exists =
      fs.existsSync(new_dir_path) && fs.statSync(new_dir_path).isDirectory();

    if (dir_already_exists) {
      throw new Error(`Directory ${new_dir_path} already exists.`);
    }

    function handle_ts_or_js_file_copy({
      code,
      destination_without_extension,
      is_jsx,
    }: {
      code: string;
      destination_without_extension: string;
      is_jsx: boolean;
    }) {
      return handle_ts_or_js_file_copy_low_level({
        code,
        destination_without_extension,
        is_jsx,
        new_dir_path,
      });
    }

    // create all the folders we need
    fs.mkdirSync(new_dir_path, { recursive: true });
    fs.mkdirSync(path.join(new_dir_path, "src"), { recursive: true });
    fs.mkdirSync(path.join(new_dir_path, "public"), { recursive: true });
    fs.mkdirSync(path.join(new_dir_path, "src/styles"), { recursive: true });
    fs.mkdirSync(path.join(new_dir_path, "src/pages"), { recursive: true });
    fs.mkdirSync(path.join(new_dir_path, "src/pages/__auth"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(new_dir_path, "src/pages/about"), {
      recursive: true,
    });

    if (options.css_preference === "css-hooks") {
      fs.mkdirSync(path.join(new_dir_path, "src/setup"), { recursive: true });

      await handle_ts_or_js_file_copy({
        code: get_css_hooks_setup(),
        destination_without_extension: "src/setup/css-hooks",
        is_jsx: true,
      });
    }

    // ts-config
    fs.writeFileSync(
      path.join(new_dir_path, "tsconfig.json"),
      await format(get_ts_config(options), {
        parser: "json",
      }),
      "utf8",
    );

    // hwy-config
    fs.writeFileSync(
      path.join(new_dir_path, "hwy.config.ts"),
      await format(get_hwy_config(options), {
        parser: "typescript",
      }),
      "utf8",
    );

    // tailwind-config
    if (options.css_preference === "tailwind") {
      fs.writeFileSync(
        path.join(new_dir_path, "tailwind.config.ts"),
        await format(get_tailwind_config(), {
          parser: "typescript",
        }),
        "utf8",
      );
    }

    // readme
    fs.writeFileSync(
      path.join(new_dir_path, "README.md"),
      await format(get_readme(options), {
        parser: "markdown",
      }),
      "utf8",
    );

    // package-json
    fs.writeFileSync(
      path.join(new_dir_path, "package.json"),
      await format(get_package_json(options), {
        parser: "json",
      }),
      "utf8",
    );

    // main
    await handle_ts_or_js_file_copy({
      code: await format(get_main(options), {
        parser: "typescript",
      }),
      destination_without_extension: "src/main",
      is_jsx: true,
    });

    // gitignore
    fs.writeFileSync(
      path.join(new_dir_path, ".gitignore"),
      get_gitignore(options),
      "utf8",
    );

    // client-entry
    await handle_ts_or_js_file_copy({
      code: await format(get_client_entry(options), {
        parser: "typescript",
      }),
      destination_without_extension: "src/entry.client",
      is_jsx: false,
    });

    const root_dir_path = path.join(
      dirname_from_import_meta(import.meta.url),
      `../`,
    );

    // public dir
    fs.cpSync(
      path.join(root_dir_path, "__public"),
      path.join(new_dir_path, "public"),
      { recursive: true },
    );

    // styles
    fs.cpSync(
      path.join(root_dir_path, "__common/styles/global.critical.css"),
      path.join(new_dir_path, "src/styles/global.critical.css"),
    );

    let standard_styles = fs.readFileSync(
      path.join(root_dir_path, "__common/styles/tw-input.css"),
      "utf8",
    );

    if (options.css_preference !== "tailwind") {
      standard_styles = standard_styles.replace(
        `@tailwind base;
@tailwind components;
@tailwind utilities;\n\n`,
        "",
      );
    }

    fs.writeFileSync(
      path.join(
        new_dir_path,
        "src/styles/" +
          (options.css_preference === "tailwind"
            ? "tw-input.css"
            : "global.bundle.css"),
      ),
      standard_styles,
      "utf8",
    );

    if (options.with_nprogress) {
      fs.cpSync(
        path.join(root_dir_path, "__common/styles/nprogress.bundle.css"),
        path.join(new_dir_path, "src/styles/nprogress.bundle.css"),
      );
    }

    if (options.css_preference !== "tailwind") {
      fs.cpSync(
        path.join(root_dir_path, "__common/styles/_preflight.bundle.css"),
        path.join(new_dir_path, "src/styles/_preflight.bundle.css"),
      );
    }

    // pages dir in __common
    const tsx_list = [
      "about.page",
      "$.page",
      "_index.page",
      "about/_index.page",
      "about/learn-more.page",
      "__auth/login.page",
    ];

    const ts_list = ["_index.client"];

    const files_to_copy = [...tsx_list, ...ts_list];

    await Promise.all(
      files_to_copy.map(async (file) => {
        const is_jsx = tsx_list.includes(file);

        return handle_ts_or_js_file_copy({
          code: fs.readFileSync(
            path.join(
              root_dir_path,
              "__common/pages/" + file + (is_jsx ? ".tsx" : ".ts"),
            ),
            "utf8",
          ),
          destination_without_extension: "src/pages/" + file,
          is_jsx,
        });
      }),
    );

    if (options.deployment_target === "vercel-lambda") {
      fs.mkdirSync(path.join(new_dir_path, "api"), { recursive: true });
      fs.writeFileSync(
        path.join(new_dir_path, "api/main.js"),
        "/* Commit this file to make Vercel happy. */\n",
        "utf8",
      );

      const vercel_json =
        `
{
  "rewrites": [{ "source": "/(.*)", "destination": "/api/main" }],
  "functions": {
    "api/main.js": { "includeFiles": "**/*" }
  }
}
`.trim() + "\n";

      fs.writeFileSync(
        path.join(new_dir_path, "vercel.json"),
        vercel_json,
        "utf8",
      );
    }

    if (get_is_target_deno(options)) {
      fs.writeFileSync(
        path.join(new_dir_path, "deno.json"),
        JSON.stringify(
          {
            imports: {
              hono: "npm:hono",
              hwy: `npm:hwy@${LATEST_HWY_VERSION}`,
              "hono/deno": "npm:hono/deno",
              "hono/logger": "npm:hono/logger",
              "hono/secure-headers": "npm:hono/secure-headers",
            },
            compilerOptions: {
              jsx: "react-jsx",
              jsxImportSource: "npm:hono/jsx",
            },
          },
          null,
          2,
        ) + "\n",
        "utf8",
      );
    }

    const applicable_instructions =
      options.deployment_target === "bun"
        ? bun_instructions
        : get_is_target_deno(options)
          ? deno_instructions
          : npm_instructions;

    console.log(
      pc.cyan(
        `\nNice. Your new Hwy project is ready to go.\n\nTo get started, run:\n\n  ${pc.green(
          `cd ` + choices.new_dir_name + applicable_instructions,
        )}\n\nPlease be sure to:\n\n${pc.bold(
          "  1.",
        )} Read the README.md file in your project root for any instructions specific to your deployment target; and\n\n${pc.bold(
          "  2.",
        )} Check out the Hwy docs at ${pc.bold(
          pc.underline(`https://hwy.dev/docs`),
        )}.\n\nHappy hacking!\n`,
      ),
    );
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

const npm_instructions = `\n  npm i\n  npm run dev`;
const deno_instructions = `\n  npm i\n  deno task dev`;
const bun_instructions = `\n  bun i\n  bun run --bun dev`;

await main();

async function handle_ts_or_js_file_copy_low_level({
  code,
  destination_without_extension,
  is_jsx,
  new_dir_path,
}: {
  code: string;
  destination_without_extension: string;
  is_jsx: boolean;
  new_dir_path: string;
}) {
  const ts_ext = is_jsx ? ".tsx" : ".ts";
  fs.writeFileSync(
    path.join(new_dir_path, destination_without_extension + ts_ext),
    code,
    "utf8",
  );
}

export type { Options };
