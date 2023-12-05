import { EmitError, joinTrees } from "../../common/emit";
import { IR } from "../../IR";
import { TokenTree } from "../../common/Language";

export default function emitProgram(program: IR.Node): TokenTree {
  function emitMultiNode(BaseNode: IR.Node, blockNeedsDo = false): TokenTree {
    const children = BaseNode.kind === "Block" ? BaseNode.children : [BaseNode];
    if (BaseNode.kind === "Block" && blockNeedsDo) {
      return ["(", "do", joinNodes("", children), ")"];
    }
    return joinNodes("", children);
  }

  function joinNodes(delim: TokenTree, exprs: readonly IR.Node[]) {
    return joinTrees(
      delim,
      exprs.map((x) => emit(x)),
    );
  }

  /**
   * Emits the expression.
   * @param expr The expression to be emited.
   * @returns  Token tree corresponding to the expression.
   */
  function emit(e: IR.Node): TokenTree {
    switch (e.kind) {
      case "Block":
        return emitMultiNode(e);
      case "While":
        return ["(", "while", emit(e.condition), emitMultiNode(e.body), ")"];
      case "ForEach":
        return [
          "(",
          "each",
          emit(e.variable),
          emit(e.collection),
          emitMultiNode(e.body),
          ")",
        ];
      case "If":
        return [
          "(",
          "if",
          emit(e.condition),
          emitMultiNode(e.consequent, true),
          e.alternate === undefined ? [] : emitMultiNode(e.alternate, true),
          ")",
        ];
      case "VarDeclarationWithAssignment": {
        const ass = e.assignment;
        if (ass.kind !== "Assignment") {
          throw new EmitError(e, `Declaration cannot contain ${ass.kind}`);
        }
        return ["(", "var", emit(ass.variable), emit(ass.expr), ")"];
      }
      case "Assignment":
        return ["(", "set", emit(e.variable), emit(e.expr), ")"];
      case "Identifier":
        return e.name;
      case "Integer":
        return e.value.toString();
      case "Infix":
        return ["(", e.name, emit(e.left), emit(e.right), ")"];
      case "Prefix":
        return ["(", e.name, emit(e.arg), ")"];
      default:
        throw new EmitError(e);
    }
  }

  return emitMultiNode(program);
}
