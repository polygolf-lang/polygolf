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
  type Op,
  type OpCode,
  isBuiltinIdent,
  isText,
  PhysicalOpCode,
} from "../../IR";
import { getType } from "../../common/getType";
import { addImports } from "../../plugins/imports";
import type { PluginVisitor, Spine } from "../../common/Spine";
import type { CompilationContext } from "../../common/compile";

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

export const addNimImports: PluginVisitor = addImports(
  {
    math: ["^", "gcd"],
    strutils: [
      "repeat",
      "replace",
      "join",
      "split",
      "find",
      "toBin",
      "toHex",
      "align",
      "startsWith",
      "endsWith",
    ],
    sequtils: ["toSeq"],
    os: ["paramStr", "commandLineParams"],
    hashes: ["hashes"],
    tables: ["Table"],
    sets: ["Sets"],
    unicode: ["toRunes", "Rune"],
    algorithm: ["sorted", "reversed"],
    bitops: ["popcount"],
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
      ? op[`unsigned_${node.op}`](...node.args)
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
  if (node.kind === "Infix" && node.name === " " && isIdent()(node.left)) {
    return infix(".", node.right, node.left);
  }
}

export function useBackwardsIndex(node: Node, spine: Spine) {
  if (
    isOp()(node) &&
    (node.op.includes("at_back") || node.op.includes("slice_back"))
  ) {
    return op.unsafe(node.op)(
      ...(node.args as readonly Node[]).with(
        1,
        prefix(
          "system.^",
          op.neg(
            (node as Op<`${string}at_back${string}` & PhysicalOpCode>).args[1],
          ),
        ),
      ),
    );
  }
}

export function getEndIndex(start: Node, length: Node) {
  if (start.kind === "Prefix" && start.name === "system.^") {
    return prefix(start.name, op.sub(start.arg, length));
  }
  return op.add(start, length);
}

export function removeSystemNamespace(node: Node, spine: Spine) {
  if ("name" in node && node.name.startsWith("system.")) {
    return { ...node, name: node.name.slice("system.".length) };
  }
}

export function removeToSeqFromFor(node: Node, spine: Spine) {
  if (
    node.kind === "FunctionCall" &&
    isBuiltinIdent("toSeq")(node.func) &&
    spine.parent?.node.kind === "ForEach" &&
    spine.pathFragment?.prop === "collection"
  ) {
    return node.args[0];
  }
}

export function useRawStringLiteral(
  node: Node,
  spine: Spine,
  context: CompilationContext,
) {
  if (
    node.kind === "Infix" &&
    node.name === " " &&
    isText()(node.right) &&
    (isIdent()(node.left) ||
      (node.left.kind === "Infix" && node.left.name === "."))
  ) {
    const [low, high] = context.options.codepointRange;
    if (low === 1 && high === Infinity) {
      if (
        !node.right.value.includes("\n") &&
        !node.right.value.includes("\r")
      ) {
        return infix("", node.left, node.right);
      }
    }
  }
}
