import { EmitError, emitIntLiteral, emitTextFactory } from "../../common/emit";
import { isInt, type IR } from "../../IR";
import { type TokenTree } from "../../common/Language";

const emitClojureText = emitTextFactory({
  '"TEXT"': { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, '"': `\\"` },
});

export default function emitProgram(program: IR.Node): TokenTree {
  function emitMultiNode(BaseNode: IR.Node, blockNeedsDo = false): TokenTree {
    const children = BaseNode.kind === "Block" ? BaseNode.children : [BaseNode];
    if (BaseNode.kind === "Block" && blockNeedsDo) {
      return ["(", "do", children.map((x) => emit(x)), ")"];
    }
    return children.map((x) => emit(x));
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
          "doseq",
          "[",
          emit(e.variable),
          emit(e.collection),
          "]",
          emitMultiNode(e.body),
          ")",
        ];
      case "ForRange": {
        const varName = e.variable === undefined ? "_" : emit(e.variable);
        return isInt(0n)(e.start) && isInt(1n)(e.increment)
          ? [
              "(",
              "dotimes",
              "[",
              varName,
              emit(e.end),
              "]",
              emitMultiNode(e.body),
              ")",
            ]
          : [
              "(",
              "doseq",
              "[",
              varName,
              "(",
              "range",
              emit(e.start),
              emit(e.end),
              isInt(1n)(e.increment) ? [] : emit(e.increment),
              ")",
              "]",
              emitMultiNode(e.body),
              ")",
            ];
      }
      case "If":
        // TODO: use when when no alternate and multiple statements
        return [
          "(",
          "if",
          emit(e.condition),
          emitMultiNode(e.consequent, true),
          e.alternate === undefined ? [] : emitMultiNode(e.alternate, true),
          ")",
        ];
      case "Assignment":
        return ["(", "def", emit(e.variable), emit(e.expr), ")"];
      case "Identifier":
        return e.name;
      case "Text":
        return emitClojureText(e.value);
      case "Integer":
        return emitIntLiteral(e, {
          10: ["", ""],
          16: ["0x", ""],
          36: ["36r", ""],
        });
      case "FunctionCall":
        return ["(", emit(e.func), e.args.map((x) => emit(x)), ")"];
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
        return ["[", e.exprs.map((x) => emit(x)), "]"];
      case "Table":
        return ["{", e.kvPairs.map((x) => [emit(x.key), emit(x.value)]), "}"];
      default:
        throw new EmitError(e);
    }
  }

  return emitMultiNode(program);
}
