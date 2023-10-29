import {
  importStatement,
  integerType,
  isIdent,
  isOfKind,
  isPolygolfOp,
  isSubtype,
  isTextLiteral,
  methodCall,
  polygolfOp,
} from "../../IR";
import { getType } from "../../common/getType";
import { type Plugin } from "../../common/Language";
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
    ["join", "strutils"],
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
  },
);

export const useUnsignedDivision: Plugin = {
  name: "useUnsignedDivision",
  visit(node, spine) {
    if (isPolygolfOp("trunc_div", "rem")(node)) {
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
      if (node.args.length === 1 && isTextLiteral()(node.args[0])) {
        return;
      }
      const [obj, ...args] = node.args;
      if (!isOfKind("BinaryOp", "UnaryOp")(obj) && isIdent()(node.func)) {
        return methodCall(obj, node.func, ...args);
      }
    }
  },
};
