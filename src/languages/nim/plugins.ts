import { block, ImportStatement, importStatement, methodCall } from "../../IR";
import { getType } from "../../common/getType";
import { Plugin } from "../../common/Language";

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

const dependencyMap = new Map([
  ["^", "math"],
  ["repeat", "strutils"],
  ["paramStr", "os"],
  ["split", "strutils"],
  ["hash", "hashes"],
]);
export const addImports: Plugin = {
  name: "addImports",
  visit(program, spine) {
    if (program.kind !== "Program") return;
    // get dependencies
    // TODO: abstract this part for other languages
    // TODO: cache, and maybe do recursive merging for performance
    const dependenciesGen = spine.compactMap((node) => {
      let op: string = node.kind;
      if (node.kind === "BinaryOp" || node.kind === "UnaryOp") op = node.name;
      if (node.kind === "FunctionCall") op = node.ident.name;
      if (node.kind === "MethodCall") op = node.ident.name;
      if (dependencyMap.has(op)) {
        return dependencyMap.get(op)!;
      }
      if (node.kind === "TableConstructor") return "tables";
    });
    const dependencies = [...new Set(dependenciesGen)];
    if (dependencies.length < 1) return;
    // now actually apply dependencies
    let imports: ImportStatement;
    for (const include of includes) {
      if (include[0].length > dependencies.join().length - 1) break;
      if (dependencies.every((x) => include[1].includes(x))) {
        imports = importStatement("include", [include[0]]);
        break;
      }
    }
    imports ??= importStatement("import", dependencies);
    return {
      ...program,
      body:
        program.body.kind === "Block"
          ? block([imports, ...program.body.children])
          : block([imports, program.body]),
    };
  },
};

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
