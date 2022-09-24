import { importStatement, Program } from "../../IR";
import { Path } from "../../common/traverse";

const includes: [string, string[]][] = [
  ["re", ["strutils"]],
  ["net", ["os", "strutils"]],
  ["math", ["since", "bitops", "fenv"]],
  ["tables", ["since", "hashes", "math", "algorithm"]],
  [
    "prelude",
    [
      "os",
      "strutils",
      "times",
      "parseutils",
      "hashes",
      "tables",
      "sets",
      "sequtils",
      "parseopt",
      "strformat",
    ],
  ],
];

export const addImports = {
  exit(path: Path) {
    if (path.node.type === "Program") {
      const program: Program = path.node;
      const dependecies = [...program.dependencies];
      if (dependecies.length < 1) return;
      for (const include of includes) {
        if (dependecies.every((x) => include[1].includes(x))) {
          program.block.children = [
            importStatement("include", [include[0]]),
            ...program.block.children,
          ];
          return;
        }
      }
      program.block.children = [
        importStatement("import", dependecies),
        ...program.block.children,
      ];
    }
  },
};
