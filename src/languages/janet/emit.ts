import {
  EmitError,
  emitIntLiteral,
  emitTextFactory,
  getIfChain,
} from "../../common/emit";
import { isInt, type IR } from "../../IR";
import { type TokenTree } from "../../common/Language";

const emitJanetText = emitTextFactory({
  '"TEXT"': { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, '"': `\\"` },
  "`\nTEXT\n`": { "`": null },
  "``\nTEXT\n``": { "``": null },
  /* TO-DO: Introduce "`TEXT`" string literal:
     Cannot be empty or begin/end with a newline
   */
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
      case "If": {
        const { ifs, alternate } = getIfChain(e);
        return [
          "(",
          ifs.length > 1 ? "cond" : "if",
          ifs.map((x) => [
            emit(x.condition),
            emitMultiNode(x.consequent, true),
          ]),
          alternate === undefined ? [] : emitMultiNode(alternate, true),
          ")",
        ];
      }
      case "VarDeclarationWithAssignment": {
        const assignment = e.assignment;
        if (assignment.kind !== "Assignment") {
          throw new EmitError(
            e,
            `Declaration cannot contain ${assignment.kind}`,
          );
        }
        const assignKeyword = "var";
        return [
          "(",
          assignKeyword,
          emit(assignment.variable),
          emit(assignment.expr),
          ")",
        ];
      }
      case "Assignment":
        return ["(", "set", emit(e.variable), emit(e.expr), ")"];
      case "Identifier":
        return e.name;
      case "Text":
        return emitJanetText(e.value);
      case "Integer":
        return emitIntLiteral(e, {
          10: ["", ""],
          16: ["0x", ""],
          36: ["36r", ""],
        });
      case "FunctionCall":
        return ["(", emit(e.func), e.args.map((x) => emit(x)), ")"];
      case "RangeIndexCall":
        if (!isInt(1n)(e.step)) throw new EmitError(e, "step not equal one");
        return isInt(0n)(e.low)
          ? ["(", "take", emit(e.high), emit(e.collection), ")"]
          : ["(", "slice", emit(e.collection), emit(e.low), emit(e.high), ")"];
      case "ConditionalOp": {
        const { ifs, alternate } = getIfChain(e);
        return [
          "(",
          ifs.length > 1 ? "cond" : "if",
          ifs.map((x) => [emit(x.condition), emit(x.consequent)]),
          emit(alternate!),
          ")",
        ];
      }
      case "List":
        return ["@[", e.exprs.map((x) => emit(x)), "]"];
      case "Table":
        return ["@{", e.kvPairs.map((x) => [emit(x.key), emit(x.value)]), "}"];
      default:
        throw new EmitError(e);
    }
  }

  return emitMultiNode(program);
}
