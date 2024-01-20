import {
  defaultWhitespaceInsertLogic,
  DetokenizingEmitter,
  flattenTree,
  type Token,
  type TokenTree,
} from "../../common/Language";
import {
  EmitError,
  emitIntLiteral,
  emitTextFactory,
  joinTrees,
} from "../../common/emit";
import { type IR, isText, isOfKind, id } from "../../IR";
import { type CompilationContext } from "@/common/compile";

function codepointMap(x: number) {
  if (x < 128) return `\\x${x.toString(16).padStart(2, "0")}`;
  if (x < 1 << 16) return `\\u${x.toString(16).padStart(4, "0")}`;
  return `\\u{${x.toString(16)}}`;
}

export const emitJavascriptText = emitTextFactory(
  {
    '"TEXT"': { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, '"': `\\"` },
    "'TEXT'": { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, "'": `\\"` },
    "`TEXT`": { "\\": `\\\\`, "`": "\\`", "${": "\\${" },
  },
  codepointMap,
);
export const emitJavascriptTextBackticks = emitTextFactory(
  {
    "`TEXT`": { "\\": `\\\\`, "`": "\\`", "${": "\\${" },
  },
  codepointMap,
);

function precedence(expr: IR.Node): number {
  switch (expr.kind) {
    case "PropertyCall":
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
  if (opname.endsWith("=")) return 0;
  throw new Error(
    `Programming error - unknown Javascript binary operator '${opname}.'`,
  );
}

export class JavascriptEmitter extends DetokenizingEmitter {
  detokenize(tokens: Token[]) {
    let result = "";
    tokens.forEach((token, i) => {
      if (i === tokens.length - 1) result += token;
      else {
        const nextToken = tokens[i + 1];
        if (token === "\n" && "([`+-/".includes(nextToken[0])) {
          token = ";";
        }
        result += token;
        if (defaultWhitespaceInsertLogic(token, nextToken)) {
          result += " ";
        }
      }
    });
    return result;
  }

  emitTokens(program: IR.Node, context: CompilationContext) {
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
          case "VarDeclarationWithAssignment":
            return ["let", emit(e.assignment)];
          case "Block":
            return expr === program
              ? joinNodes("\n", e.children)
              : e.children.some(
                  isOfKind(
                    "If",
                    "While",
                    "ForEach",
                    "ForCLike",
                    "VarDeclarationWithAssignment",
                  ),
                )
              ? ["{", joinNodes("\n", e.children), "}"]
              : joinNodes(",", e.children);
          case "Function":
            return ["(", joinNodes(",", e.args), ")", "=>", emit(e.expr)];
          case "Assignment":
            return [emit(e.variable), "=", emit(e.expr)];
          case "FunctionCall":
            if (e.args.length === 1 && isText()(e.args[0]))
              return [
                emit(e.func),
                emitJavascriptTextBackticks(e.args[0].value),
              ];
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
            return ["[", joinNodes(",", e.value), "]"];
          case "Table":
            return [
              "{",
              joinTrees(
                ",",
                e.value.map((x) => [
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
              emit(e.condition, prec + 1),
              "?",
              emit(e.consequent),
              ":",
              emit(e.alternate, prec),
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
          case "IndexCall":
            return [emit(e.collection, Infinity), "[", emit(e.index), "]"];
          case "PropertyCall":
            return [emit(e.object, prec), ".", emit(e.ident)];
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
              emit(e.variable ?? id()),
              e.collection.targetType === "object" ? "in" : "of",
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
    return flattenTree(emit(program));
  }
}
