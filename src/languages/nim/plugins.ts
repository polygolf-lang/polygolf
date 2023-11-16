import {
  type Node,
  importStatement,
  integerType,
  isIdent,
  isOfKind,
  isOp,
  isSubtype,
  isText,
  methodCall,
  op,
} from "../../IR";
import { getType } from "../../common/getType";
import type { Plugin } from "../../common/Language";
import { addImports } from "../../plugins/imports";
import type { Spine } from "../../common/Spine";

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
    repeat: "strutils",
    replace: "strutils",
    multireplace: "strutils",
    join: "strutils",
    paramStr: "os",
    commandLineParams: "os",
    split: "strutils",
    hash: "hashes",
    Table: "tables",
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
  if (node.kind === "FunctionCall" && node.args.length > 0) {
    if (node.args.length === 1 && isText()(node.args[0])) {
      return;
    }
    const [obj, ...args] = node.args;
    if (!isOfKind("Infix", "Prefix")(obj) && isIdent()(node.func)) {
      return methodCall(obj, node.func, ...args);
    }
  }
}
