import {
  functionCall,
  type Node,
  importStatement,
  infix,
  integerType,
  isIdent,
  isOp,
  isSubtype,
  op,
  prefix,
} from "../../IR";
import { getType } from "../../common/getType";
import type { Plugin } from "../../common/Language";
import { addImports } from "../../plugins/imports";
import type { Spine } from "../../common/Spine";
import { replaceAtIndex } from "../../common/arrays";

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

export const addNimImports: Plugin = addImports(
  {
    "^": "math",
    gcd: "math",
    repeat: "strutils",
    replace: "strutils",
    multireplace: "strutils",
    join: "strutils",
    find: "strutils",
    in: "strutils",
    toBin: "strutils",
    toHex: "strutils",
    align: "strutils",
    paramStr: "os",
    commandLineParams: "os",
    split: "strutils",
    hash: "hashes",
    Table: "tables",
    Set: "sets",
    toRunes: "unicode",
    Rune: "unicode",
    sorted: "algorithm",
    reversed: "algorithm",
  },
  (modules: string[]) => {
    if (modules.length < 1) return;
    for (const include of includes) {
      if (include[0].length > modules.join().length - 1) break;
      if (modules.every((x) => include[1].includes(x))) {
        return importStatement("include", [include[0]]);
      }
    }
    return importStatement("import", modules);
  },
);

export function useUnsignedDivision(node: Node, spine: Spine) {
  if (isOp("trunc_div", "rem")(node)) {
    return isSubtype(getType(node.args[0], spine), integerType(0)) &&
      isSubtype(getType(node.args[0], spine), integerType(0))
      ? op(`unsigned_${node.op}`, ...node.args)
      : undefined;
  }
}

export function useUFCS(node: Node) {
  if (node.kind === "FunctionCall") {
    if (node.args.length === 1) {
      return infix(" ", node.func, node.args[0]);
    }
    if (node.args.length > 1 && isIdent()(node.func)) {
      return functionCall(
        infix(".", node.args[0], node.func),
        ...node.args.slice(1),
      );
    }
  }
  if (node.kind === "Infix" && node.name === " " && isIdent()(node.args[0])) {
    return infix(".", node.args[1], node.args[0]);
  }
}

export function useBackwardsIndex(node: Node, spine: Spine) {
  if (isOp()(node) && node.op.includes("at_back")) {
    return op(
      node.op,
      ...replaceAtIndex(
        node.args,
        1,
        prefix("system.^", op("neg", node.args[1])),
      ),
    );
  }
}

export function removeSystemNamespace(node: Node, spine: Spine) {
  if ("name" in node && node.name.startsWith("system.")) {
    return { ...node, name: node.name.slice("system.".length) };
  }
}
