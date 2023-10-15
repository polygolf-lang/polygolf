import { EmitError, joinTrees } from "../../common/emit";
import { Expr, Program } from "../../IR";
import { TokenTree } from "../../common/Language";

type HexagonyTree =
  | {
      kind: "Op";
      name: string;
    }
  | {
      kind: "If";
      consequent: HexagonyTree[];
      alternate: HexagonyTree[];
    }
  | {
      kind: "While" | "WhileNot";
      body: HexagonyTree[];
    };

function getHexagonyTree(node: Expr): HexagonyTree[] {
  if (node.kind === "Block") {
    return node.children.flatMap(getHexagonyTree);
  }
  if (
    node.kind === "FunctionCall" &&
    node.func.kind === "Identifier" &&
    node.func.builtin
  ) {
    if (node.func.name === "If" && node.args.length === 2) {
      return [
        {
          kind: "If",
          consequent: getHexagonyTree(node.args[0]),
          alternate: getHexagonyTree(node.args[1]),
        },
      ];
    }
    if (
      (node.func.name === "While" || node.func.name === "WhileNot") &&
      node.args.length === 1
    ) {
      return [{ kind: node.func.name, body: getHexagonyTree(node.args[0]) }];
    }
    if (node.args.length === 0) {
      return [{ kind: "Op", name: node.func.name }];
    }
  }
  console.log(node);
  throw new EmitError(node);
}

export default function emitProgram(program: Program): TokenTree {
  const tree = getHexagonyTree(program.body);
  return tree[0].kind;
}

export function emitProgramLinearly(program: Program): TokenTree {
  function emitTree(x: HexagonyTree | HexagonyTree[]): TokenTree {
    if (Array.isArray(x)) return joinTrees("\n", x.map(emitTree));
    switch (x.kind) {
      case "If":
        return [
          "If",
          "$INDENT$",
          "\n",
          emitTree(x.consequent),
          "$DEDENT$",
          "\n",
          "Else",
          "$INDENT$",
          emitTree(x.alternate),
        ];
      case "While":
      case "WhileNot":
        return [x.kind, "$INDENT$", "\n", emitTree(x.body), "$DEDENT$"];
      case "Op":
        return x.name;
    }
  }
  return emitTree(getHexagonyTree(program.body));
}
