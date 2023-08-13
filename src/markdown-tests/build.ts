import { findLang } from "../languages/languages";
import fs from "fs";
import path from "path";
import { emitTextLiteral } from "../common/emit";

interface Test {
  input: string;
  language: string;
  args: string[];
  output: string;
}

interface Describe {
  name: string;
  children: (Test | Describe)[];
  parent: Describe | null;
  level: number;
}

interface Header {
  kind: "Header";
  level: number;
  title: string;
}
interface CodeBlock {
  kind: "CodeBlock";
  language: string;
  args: string[];
  content: string;
}

/** Parses a single markdown test source. */
function parseSuite(markdown: string): Describe {
  const result: Describe = {
    name: "root",
    children: [],
    parent: null,
    level: 0,
  };
  let currentDescribe = result;
  let lastInput: CodeBlock | null = null;
  for (const tag of extractTags(markdown)) {
    if (tag.kind === "Header") {
      if (tag.level > currentDescribe.level + 1) {
        throw new Error("Header level must increase by at most one.");
      }
      while (tag.level <= currentDescribe.level) {
        currentDescribe = currentDescribe.parent!;
      }
      const newDescribe = {
        name: tag.title,
        children: [],
        parent: currentDescribe,
        level: tag.level,
      };
      currentDescribe.children.push(newDescribe);
      currentDescribe = newDescribe;
    } else if (!tag.args.includes("skip")) {
      if (tag.args.length > 1) {
        throw new Error("Codeblocks expect at most one argument.");
      }
      if (tag.language === "polygolf" && tag.args.length === 0) {
        lastInput = tag;
      } else {
        if (lastInput === null) {
          throw new Error("No input block found!");
        }
        const lang = findLang(tag.language);
        if (lang === undefined) {
          throw new Error(`Unknown language ${tag.language}`);
        }
        currentDescribe.children.push({
          input: lastInput.content,
          language: lang.name,
          args: tag.args,
          output: tag.content,
        });
      }
    }
  }
  function removeEmptyDescribes(describe: Describe) {
    for (const child of describe.children) {
      if ("children" in child) {
        removeEmptyDescribes(child);
      }
    }
    describe.children = describe.children.filter(
      (x) => "input" in x || x.children.length > 0
    );
  }
  removeEmptyDescribes(result);
  if (result.children.length === 1 && "children" in result.children[0])
    return result.children[0];
  return result;
}

/** Extracts relevant markdown sections:
 *  Headlines and codeblocks.
 */
function extractTags(markdown: string): (Header | CodeBlock)[] {
  const result: (Header | CodeBlock)[] = [];
  const regex = /\n(#+)([^\n]+)\n|```([^`\n]*)\n((.(?!```))*)\n```/gs;
  for (const m of ("\n" + markdown).matchAll(regex)) {
    if (m[1] !== undefined) {
      result.push({
        kind: "Header",
        level: m[1].length,
        title: m[2].trim(),
      });
    } else {
      const title = m[3].trim().split(" ");
      if (m[3].trim().length === 0) {
        throw new Error(
          "Codeblocks are required to have language annotation. If a codeblock should not be included in testing, use `skip` command: `python skip`."
        );
      }
      result.push({
        kind: "CodeBlock",
        language: title[0],
        args: title.slice(1),
        content: m[4].trim(),
      });
    }
  }
  return result;
}

/** Emits a single markdown test. */
function emitSuite(describe: Describe): string {
  const imports: string[] = [];
  const tests = emitDescribe(describe, imports);
  const importSet = new Set<string>();
  for (const x of imports) importSet.add(x);

  // The `@/` path is defined relatively in `tsconfig.json`, pointing to the `src` directory.
  return `import parse from "frontend/parse";
  import compile, { applyAll, debugEmit, normalize } from "@/common/compile";
  import { findLang } from "@/languages/languages";
  import { Plugin } from "@/common/Language";
  import { getOnlyVariant } from "@/common/expandVariants";

  ${[...importSet]
    .map(
      (x) =>
        `import * as ${x
          .split("/")
          .at(-1)!
          .replace("static", "static_")} from "./${x}";`
    )
    .join("\n")}

  function testLang(name: string, lang: string, obj: "nogolf" | "bytes" | "chars", input: string, output: string) {
    test(name, () =>
      expect(compile(input, {level: obj === "nogolf" ? "none" : "full", objective: obj === "chars" ? "chars" : "bytes", restrictFrontend: false}, findLang(lang)!)[0].result).toEqual(output)
    );
  }

  function testPlugin(name: string, plugin: Plugin, input: string, output: string) {
    test(name, () =>
      expect(debugEmit(applyAll(getOnlyVariant(parse(input, false)), plugin.visit))).toEqual(normalize(output))
    );
  }

  ${tests}`;
}

function emitNode(node: Describe | Test, imports: string[]): string {
  if ("children" in node) return emitDescribe(node, imports);
  return emitTest(node, imports);
}

function stringify(x: string): string {
  return emitTextLiteral(x, [
    [
      "`",
      [
        [`\\`, `\\\\`],
        [`\n`, `\\n`],
        [`\r`, `\\r`],
        ["`", "\\`"],
        ["$", "\\$"],
      ],
    ],
    [
      `"`,
      [
        [`\\`, `\\\\`],
        [`\n`, `\\n`],
        [`\r`, `\\r`],
        [`"`, `\\"`],
      ],
    ],
    [
      `'`,
      [
        [`\\`, `\\\\`],
        [`\n`, `\\n`],
        [`\r`, `\\r`],
        [`'`, `\\"`],
      ],
    ],
  ]);
}

function emitDescribe(describe: Describe, imports: string[]): string {
  return (
    `describe(${stringify(describe.name)}, () => {\n${describe.children
      .map((x) => emitNode(x, imports))
      .join("\n")}`.replaceAll("\n", "\n  ") + "\n});"
  );
}

function emitTest(test: Test, imports: string[]): string {
  if (test.language === "Polygolf" && test.args[0] !== "nogolf") {
    const m = test.args[0].match(/(.+)\.(.+)/);
    if (m !== null) {
      const path = m[1];
      const plugin = m[2];
      imports.push(path);
      return `testPlugin(${stringify(plugin)}, ${path
        .split("/")
        .at(-1)!
        .replace("static", "static_")}.${plugin}, ${stringify(
        test.input
      )}, ${stringify(test.output)});`;
    }
    throw new Error(`Unexpected polygolf argument ${test.args[0]}.`);
  }
  return `testLang(${stringify(
    [test.language, ...test.args].join(" ")
  )}, ${stringify(test.language)}, "${test.args[0] ?? "bytes"}", ${stringify(
    test.input
  )}, ${stringify(test.output)});`;
}

/** Compiles a single markdown test suite source to a Jest source. */
function compileSuite(markdown: string): string {
  const suite = parseSuite(markdown);
  if (suite.children.length === 0) return "";
  return emitSuite(suite);
}

function readdirSyncRecursive(p: string, a: string[] = []) {
  if (fs.statSync(p).isDirectory())
    fs.readdirSync(p).map((f) =>
      readdirSyncRecursive(a[a.push(path.join(p, f)) - 1], a)
    );
  return a;
}

for (const file of readdirSyncRecursive(process.cwd())) {
  if (file.endsWith(".test.md.ts")) {
    fs.unlinkSync(file);
  }
}

for (const file of readdirSyncRecursive(process.cwd())) {
  if (file.endsWith(".test.md")) {
    const suite = compileSuite(fs.readFileSync(file).toString());
    if (suite !== "") {
      fs.writeFileSync(file + ".ts", suite);
    }
  }
}
