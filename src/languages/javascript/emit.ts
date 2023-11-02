import { type TokenTree } from "@/common/Language";
import {
  EmitError,
  emitIntLiteral,
  emitTextFactory,
  joinTrees,
} from "../../common/emit";
import { type IR, isText } from "../../IR";
import { type CompilationContext } from "@/common/compile";

export const emitJavascriptText = emitTextFactory(
  {
    "`TEXT`": { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, "`": "\\`", $: "\\$" },
    '"TEXT"': { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, '"': `\\"` },
    "'TEXT'": { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, "'": `\\"` },
  },
  function (x: number) {
    if (x < 128) return `\\x${x.toString(16).padStart(2, "0")}`;
    if (x < 1 << 16) return `\\u${x.toString(16).padStart(4, "0")}`;
    return `\\u{${x.toString(16)}}`;
  },
);

function precedence(expr: IR.Node): number {
  switch (expr.kind) {
    case "PropertyCall":
    case "MethodCall":
    case "FunctionCall":
      return 17;
    case "Postfix":
      return 15;
    case "Prefix":
      return 14;
    case "Infix":
      return binaryPrecedence(expr.name);
    case "Function":
      return 2;
    case "ConditionalOp":
      return 1;
  }
  return Infinity;
}

function binaryPrecedence(opname: string): number {
  switch (opname) {
    case "**":
      return 13;
    case "*":
    case "/":
    case "%":
      return 12;
    case "+":
    case "-":
      return 11;
    case "<<":
    case ">>":
    case ">>>":
      return 10;
    case "<":
    case "<=":
    case ">=":
    case ">":
    case "in":
      return 9;
    case "==":
    case "!=":
    case "===":
    case "!==":
      return 8;
    case "&":
      return 7;
    case "^":
      return 6;
    case "|":
      return 5;
    case "&&":
      return 4;
    case "||":
      return 3;
  }
  throw new Error(
    `Programming error - unknown Javascript binary operator '${opname}.'`,
  );
}

export default function emitProgram(
  program: IR.Node,
  context: CompilationContext,
): TokenTree {
  function joinNodes(
    delim: TokenTree,
    exprs: readonly IR.Node[],
    minPrec = -Infinity,
  ) {
    return joinTrees(
      delim,
      exprs.map((x) => emit(x, minPrec)),
    );
  }

  /**
   * Emits the expression.
   * @param expr The expression to be emited.
   * @param minimumPrec Minimum precedence this expression must be to not need parens around it.
   * @returns Token tree corresponding to the expression.
   */
  function emit(expr: IR.Node, minimumPrec: number = -Infinity): TokenTree {
    const prec = precedence(expr);
    function emitNoParens(e: IR.Node): TokenTree {
      switch (e.kind) {
        case "Block":
          return expr === program
            ? joinNodes("\n", e.children)
            : ["{", joinNodes("\n", e.children), "}"];
        case "Function":
          return ["(", joinNodes(",", e.args), ")", "=>", emit(e.expr)];
        case "Assignment":
          return [emit(e.variable), "=", emit(e.expr)];
        case "FunctionCall":
          return [emit(e.func), "(", joinNodes(",", e.args), ")"];
        case "Identifier":
          return [e.name];
        case "Text":
          return emitJavascriptText(e.value, context.options.codepointRange);
        case "Integer":
          return (
            emitIntLiteral(e, { 10: ["", ""], 16: ["0x", ""] }) +
            (e.targetType === "bigint" ? "n" : "")
          );
        case "List":
        case "Array":
          return ["[", joinNodes(",", e.exprs), "]"];
        case "Table":
          return [
            "{",
            joinTrees(
              ",",
              e.kvPairs.map((x) => [
                isText()(x.key) && /\w*/.test(x.key.value)
                  ? x.key.value
                  : ["[", emit(x), "]"],
                ":",
                emit(x.value),
              ]),
            ),
            "}",
          ];
        case "ConditionalOp":
          return [
            emit(e.condition),
            "?",
            emit(e.consequent),
            ":",
            emit(e.alternate),
          ];
        case "While":
          return [`while`, "(", emit(e.condition), ")", emit(e.body)];
        case "If":
          return [
            "if",
            "(",
            emit(e.condition),
            ")",
            emit(e.consequent),
            e.alternate !== undefined ? ["else", emit(e.alternate)] : [],
          ];
        case "OneToManyAssignment":
          return [e.variables.map((v) => [emit(v), "="]), emit(e.expr)];
        case "MutatingInfix":
          return [emit(e.variable), e.name + "=", emit(e.right)];
        case "IndexCall":
          if (e.oneIndexed) throw new EmitError(expr, "one indexed");
          return [emit(e.collection, Infinity), "[", emit(e.index), "]"];

        case "MethodCall":
          return [
            emit(e.object, Infinity),
            ".",
            emit(e.ident),
            "(",
            joinNodes(",", e.args),
            ")",
          ];
        case "Infix": {
          const rightAssoc = e.name === "**";
          return [
            emit(e.left, prec + (rightAssoc ? 1 : 0)),
            e.name,
            emit(e.right, prec + (rightAssoc ? 0 : 1)),
          ];
        }
        case "Prefix":
          return [e.name, emit(e.arg, prec)];
        case "Postfix":
          return [emit(e.arg, prec), e.name];
        case "ForEach":
          return [
            `for`,
            "(",
            emit(e.variable),
            "of",
            emit(e.collection),
            ")",
            emit(e.body),
          ];
        case "ForCLike":
          return [
            "for",
            "(",
            joinNodes(";", [e.init, e.condition, e.append]),
            ")",
            emit(e.body),
          ];

        default:
          throw new EmitError(e);
      }
    }

    const inner = emitNoParens(expr);
    if (prec >= minimumPrec) return inner;
    return ["(", inner, ")"];
  }
  return emit(program);
}