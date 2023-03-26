import { importStatement, methodCall } from "../../IR";
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
    const program = spine.root.node;
    if (
      node.kind === "BinaryOp" &&
      (node.op === "trunc_div" || node.op === "rem")
    ) {
      const right = getType(node.right, program);
      const left = getType(node.left, program);
      if (right.kind !== "integer" || left.kind !== "integer")
        throw new Error(`Unexpected type ${JSON.stringify([left, right])}.`);
      if (
        left.low !== undefined &&
        left.low >= 0n &&
        right.low !== undefined &&
        right.low >= 0n
      ) {
        const name = node.op === "trunc_div" ? "/%" : "%%";
        if (name !== node.name)
          return {
            ...node,
            name,
          };
      }
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
        return methodCall(obj, args, node.ident, node.op ?? undefined);
      }
    }
  },
};
