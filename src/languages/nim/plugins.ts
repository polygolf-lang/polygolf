import {
  importStatement,
  integerType,
  isPolygolfOp,
  isSubtype,
  methodCall,
  polygolfOp,
} from "../../IR";
import { getType } from "../../common/getType";
import { Plugin } from "../../common/Language";
import { addImports } from "../../plugins/imports";

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
  [
    ["^", "math"],
    ["repeat", "strutils"],
    ["replace", "strutils"],
    ["multireplace", "strutils"],
    ["paramStr", "os"],
    ["commandLineParams", "os"],
    ["split", "strutils"],
    ["hash", "hashes"],
    ["TableConstructor", "tables"],
  ],
  (modules: string[]) => {
    if (modules.length < 1) return;
    for (const include of includes) {
      if (include[0].length > modules.join().length - 1) break;
      if (modules.every((x) => include[1].includes(x))) {
        return importStatement("include", [include[0]]);
      }
    }
    return importStatement("import", modules);
  }
);

export const useUnsignedDivision: Plugin = {
  name: "useUnsignedDivision",
  visit(node, spine) {
    if (isPolygolfOp(node, "trunc_div", "rem")) {
      return isSubtype(getType(node.args[0], spine), integerType(0)) &&
        isSubtype(getType(node.args[0], spine), integerType(0))
        ? polygolfOp(`unsigned_${node.op}`, ...node.args)
        : undefined;
    }
  },
};

export const useUFCS: Plugin = {
  name: "useUFCS",
  visit(node) {
    if (node.kind === "FunctionCall" && node.args.length > 0) {
      if (node.args.length === 1 && node.args[0].kind === "StringLiteral") {
        return;
      }
      const [obj, ...args] = node.args;
      if (obj.kind !== "BinaryOp" && obj.kind !== "UnaryOp") {
        return methodCall(obj, args, node.ident);
      }
    }
  },
};
