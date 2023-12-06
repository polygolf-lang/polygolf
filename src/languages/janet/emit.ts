import { EmitError, emitTextFactory, joinTrees } from "../../common/emit";
import { isInt, type IR } from "../../IR";
import { type TokenTree } from "../../common/Language";

const emitJanetText = emitTextFactory({
  '"TEXT"': { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, '"': `\\"` },
  "`TEXT`": { "`": null },
});

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
      case "ForRange": {
        const varName = e.variable === undefined ? "_" : emit(e.variable);
        return isInt(1n)(e.increment)
          ? [
              "(",
              "for",
              varName,
              emit(e.start),
              emit(e.end),
              emitMultiNode(e.body),
              ")",
            ]
          : [
              "(",
              "loop",
              "[",
              varName,
              ":range",
              "[",
              emit(e.start),
              emit(e.end),
              emit(e.increment),
              "]",
              "]",
              emitMultiNode(e.body),
              ")",
            ];
      }
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
      case "Text":
        return emitJanetText(e.value);
      case "Integer":
        return e.value.toString();
      case "FunctionCall":
        return ["(", emit(e.func), e.args.map((x) => emit(x)), ")"];
      case "MutatingInfix": {
        const incOrDec =
          (e.name === "+" || e.name === "-") && isInt(1n)(e.right);
        if (incOrDec) {
          return ["(", e.name === "+" ? "++" : "--", emit(e.variable), ")"];
        }
        return [
          "(",
          e.name,
          "$GLUE$",
          "=",
          emit(e.variable),
          emit(e.right),
          ")",
        ];
      }
      case "RangeIndexCall":
        if (e.oneIndexed) throw new EmitError(e, "one indexed");
        if (!isInt(1n)(e.step)) throw new EmitError(e, "step not equal one");
        return isInt(0n)(e.low)
          ? ["(", "take", emit(e.high), emit(e.collection), ")"]
          : ["(", "slice", emit(e.collection), emit(e.low), emit(e.high), ")"];
      case "ConditionalOp":
        return [
          "(",
          "if",
          emit(e.condition),
          emit(e.consequent),
          emit(e.alternate),
          ")",
        ];
      case "List":
        return ["@[", e.exprs.map((x) => emit(x)), "]"];
      case "Table":
        return [
          "@{",
          joinTrees(
            "",
            e.kvPairs.map((x) => [emit(x.key), emit(x.value)]),
          ),
          "}",
        ];
      default:
        throw new EmitError(e);
    }
  }

  return emitMultiNode(program);
}
